/**
 * Email Sync Endpoint - Simplified
 *
 * POST /api/emails/sync
 *
 * Two sync modes only:
 * 1. Full Sync - Deletes all data and rebuilds from Gmail (first sync, manual trigger, recovery)
 * 2. Incremental Sync - Fetches recent emails, inserts new ones, removes deleted ones
 *
 * Removed: History API fast sync path that caused missed emails
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit } from '../lib/rate-limiter.js';
import { getValidAccessToken } from '../lib/gmail.js';
import { listMessages, batchGetMessages, getProfile } from '../lib/gmail-api.js';
import { PLAN_LIMITS } from '../subscription/get.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many sync requests. Please wait before syncing again.'
});

// Constants
const STALE_SYNC_DAYS = 30;
const INCREMENTAL_FETCH_COUNT = 50; // Fetch 50 recent emails for quick incremental sync (~1-2 seconds)
const BATCH_SIZE = 100;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (limiter(req, res)) return;

  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  const { email, fullSync = false } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Email address is required',
      code: 'MISSING_EMAIL'
    });
  }

  try {
    // Get email account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('id, gmail_email, connection_status, last_synced, total_emails, history_id')
      .eq('user_id', user.userId)
      .eq('email', email)
      .single();

    if (accountError || !account) {
      return res.status(404).json({
        error: 'Email account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    // Check sync frequency limit based on subscription plan
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.userId)
      .single();

    const planKey = (subscription?.plan?.toLowerCase() || 'free') as keyof typeof PLAN_LIMITS;
    const planLimits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
    const syncIntervalMinutes = planLimits.syncIntervalMinutes;

    // Check if enough time has passed since last sync
    if (syncIntervalMinutes > 0 && account.last_synced) {
      const lastSyncTime = new Date(account.last_synced).getTime();
      const now = Date.now();
      const minutesSinceLastSync = (now - lastSyncTime) / (1000 * 60);

      if (minutesSinceLastSync < syncIntervalMinutes) {
        const minutesRemaining = Math.ceil(syncIntervalMinutes - minutesSinceLastSync);
        const hoursRemaining = minutesRemaining >= 60 ? Math.ceil(minutesRemaining / 60) : 0;
        const timeMessage = hoursRemaining > 0
          ? `${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}`
          : `${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}`;

        return res.status(429).json({
          error: `Sync limit reached. You can sync again in ${timeMessage}.`,
          code: 'SYNC_LIMIT_REACHED',
          nextSyncAvailable: new Date(lastSyncTime + syncIntervalMinutes * 60 * 1000).toISOString(),
          plan: planKey
        });
      }
    }

    // Get valid access token
    let accessToken: string;
    try {
      const tokenResult = await getValidAccessToken(
        user.userId,
        account.gmail_email || email
      );
      accessToken = tokenResult.accessToken;

      if (account.connection_status !== 'connected') {
        await supabase
          .from('email_accounts')
          .update({ connection_status: 'connected', updated_at: new Date().toISOString() })
          .eq('id', account.id);
      }
    } catch (tokenError: any) {
      console.error('Token error:', tokenError.message);
      await supabase
        .from('email_accounts')
        .update({ connection_status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', account.id);

      return res.status(400).json({
        error: `Gmail connection error: ${tokenError.message}. Please reconnect your Gmail account.`,
        code: 'TOKEN_ERROR'
      });
    }

    // Determine sync mode
    const isFirstSync = !account.last_synced;
    const isStaleSync = account.last_synced &&
      (Date.now() - new Date(account.last_synced).getTime()) > (STALE_SYNC_DAYS * 24 * 60 * 60 * 1000);
    const isFullSync = isFirstSync || isStaleSync || fullSync;

    const userEmail = (account.gmail_email || email).toLowerCase();
    const syncType = isFullSync ? 'full' : 'incremental';
    console.log(`Starting ${syncType} sync for ${email}`);

    if (isFullSync) {
      // ==================== FULL SYNC ====================
      // Delete all existing data and rebuild from scratch
      return await performFullSync(res, user.userId, account.id, accessToken, userEmail, planLimits.emailProcessingLimit, email);
    } else {
      // ==================== INCREMENTAL SYNC ====================
      // Fetch recent emails, insert new ones, detect deletions
      return await performIncrementalSync(res, user.userId, account.id, accessToken, userEmail, email);
    }

  } catch (error: any) {
    console.error('Email sync error:', error);

    if (error.message.includes('Gmail not connected')) {
      await supabase
        .from('email_accounts')
        .update({ connection_status: 'expired', updated_at: new Date().toISOString() })
        .eq('user_id', user.userId)
        .eq('email', email);

      return res.status(401).json({
        error: 'Gmail connection expired. Please reconnect.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      error: 'Failed to sync emails',
      code: 'SYNC_ERROR'
    });
  }
}

/**
 * Full Sync: Delete all existing data and rebuild from Gmail
 */
async function performFullSync(
  res: VercelResponse,
  userId: string,
  accountId: string,
  accessToken: string,
  userEmail: string,
  emailLimit: number,
  email: string
) {
  const maxMessages = Math.min(10000, emailLimit);
  console.log(`Full sync: fetching up to ${maxMessages} emails`);

  // Step 1: Fetch all message IDs from Gmail
  const allMessageRefs: Array<{ id: string; threadId: string }> = [];
  let pageToken: string | undefined;
  const query = '-in:sent -in:drafts -in:trash -in:spam';

  while (allMessageRefs.length < maxMessages) {
    const response = await listMessages(accessToken, {
      maxResults: Math.min(100, maxMessages - allMessageRefs.length),
      pageToken,
      q: query,
    });

    if (!response.messages || response.messages.length === 0) break;
    allMessageRefs.push(...response.messages);

    if (!response.nextPageToken) break;
    pageToken = response.nextPageToken;
  }

  console.log(`Full sync: found ${allMessageRefs.length} messages in Gmail`);

  // Safety check: Don't delete existing data if Gmail returned nothing
  if (allMessageRefs.length === 0) {
    console.warn('Full sync: Gmail returned 0 messages - keeping existing data');
    return res.status(200).json({
      success: true,
      totalSenders: 0,
      totalEmails: 0,
      message: 'No emails found - existing data preserved',
      warning: 'Gmail returned no emails. Check if account has proper permissions.',
      syncType: 'full'
    });
  }

  // Step 2: Fetch message details
  const messageIds = allMessageRefs.map(m => m.id);
  const requiredHeaders = ['From', 'Date', 'Subject', 'List-Unsubscribe'];
  const messages = await batchGetMessages(accessToken, messageIds, 'metadata', requiredHeaders);
  console.log(`Full sync: fetched ${messages.length} message details`);

  // Step 3: Delete existing emails and senders
  console.log('Full sync: clearing existing data');
  await supabase.from('emails').delete().eq('email_account_id', accountId);
  await supabase.from('email_senders').delete().eq('email_account_id', accountId);

  // Step 4: Process messages and build sender stats
  const emailsToInsert: any[] = [];
  const senderStats = new Map<string, {
    sender_email: string;
    sender_name: string;
    email_count: number;
    unread_count: number;
    first_email_date: string;
    last_email_date: string;
    unsubscribe_link: string | null;
    has_unsubscribe: boolean;
    is_newsletter: boolean;
    is_promotional: boolean;
  }>();

  for (const msg of messages) {
    const labels = msg.labelIds || [];
    if (labels.includes('SPAM') || labels.includes('TRASH')) continue;

    const fromHeader = msg.payload?.headers?.find((h: any) => h.name === 'From')?.value || '';
    const dateHeader = msg.payload?.headers?.find((h: any) => h.name === 'Date')?.value || '';
    const subjectHeader = msg.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '';
    const unsubscribeHeader = msg.payload?.headers?.find((h: any) => h.name === 'List-Unsubscribe')?.value || '';

    const { senderEmail, senderName } = parseSender(fromHeader);
    if (senderEmail === userEmail || !senderEmail) continue;

    const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : new Date(parseInt(msg.internalDate)).toISOString();
    const isUnread = labels.includes('UNREAD');

    // Add to emails list
    emailsToInsert.push({
      gmail_message_id: msg.id,
      email_account_id: accountId,
      sender_email: senderEmail,
      sender_name: senderName,
      subject: subjectHeader || '(No Subject)',
      snippet: msg.snippet || '',
      received_at: receivedAt,
      is_unread: isUnread,
      thread_id: msg.threadId,
      labels,
    });

    // Update sender stats
    const senderKey = `${senderEmail}|||${senderName}`;
    const existing = senderStats.get(senderKey);
    const unsubscribeLink = extractUnsubscribeLink(unsubscribeHeader);

    if (existing) {
      existing.email_count++;
      if (isUnread) existing.unread_count++;
      if (receivedAt < existing.first_email_date) existing.first_email_date = receivedAt;
      if (receivedAt > existing.last_email_date) existing.last_email_date = receivedAt;
      if (unsubscribeLink && !existing.unsubscribe_link) {
        existing.unsubscribe_link = unsubscribeLink;
        existing.has_unsubscribe = true;
      }
    } else {
      senderStats.set(senderKey, {
        sender_email: senderEmail,
        sender_name: senderName,
        email_count: 1,
        unread_count: isUnread ? 1 : 0,
        first_email_date: receivedAt,
        last_email_date: receivedAt,
        unsubscribe_link: unsubscribeLink,
        has_unsubscribe: !!unsubscribeLink,
        is_newsletter: labels.includes('CATEGORY_UPDATES') && !!unsubscribeLink,
        is_promotional: labels.includes('CATEGORY_PROMOTIONS'),
      });
    }
  }

  // Step 5: Insert emails in batches
  console.log(`Full sync: inserting ${emailsToInsert.length} emails`);
  for (let i = 0; i < emailsToInsert.length; i += BATCH_SIZE) {
    const batch = emailsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('emails').insert(batch);
    if (error) console.error('Email insert error:', error.message);
  }

  // Step 6: Insert senders
  const sendersToInsert = Array.from(senderStats.values()).map(s => ({
    user_id: userId,
    email_account_id: accountId,
    ...s,
    updated_at: new Date().toISOString()
  }));

  console.log(`Full sync: inserting ${sendersToInsert.length} senders`);
  for (let i = 0; i < sendersToInsert.length; i += BATCH_SIZE) {
    const batch = sendersToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('email_senders').insert(batch);
    if (error) console.error('Sender insert error:', error.message);
  }

  // Step 7: Get historyId for future incremental syncs
  let historyId: string | undefined;
  try {
    const profile = await getProfile(accessToken);
    historyId = profile.historyId;
  } catch (e) {
    console.warn('Could not get historyId:', e);
  }

  // Step 8: Update account stats
  const totalEmails = emailsToInsert.length;
  await supabase
    .from('email_accounts')
    .update({
      total_emails: totalEmails,
      last_synced: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(historyId && { history_id: historyId })
    })
    .eq('id', accountId);

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: userId,
    action_type: 'email_sync',
    description: `Full sync: ${totalEmails.toLocaleString()} emails from ${sendersToInsert.length} senders`,
    metadata: { email, syncType: 'full', totalEmails, totalSenders: sendersToInsert.length }
  });

  return res.status(200).json({
    success: true,
    totalSenders: sendersToInsert.length,
    totalEmails,
    deletedEmails: 0,
    message: 'Full sync completed successfully',
    syncType: 'full'
  });
}

/**
 * Incremental Sync: Fetch recent emails, insert new ones, detect deletions
 */
async function performIncrementalSync(
  res: VercelResponse,
  userId: string,
  accountId: string,
  accessToken: string,
  userEmail: string,
  email: string
) {
  console.log(`Incremental sync: fetching ${INCREMENTAL_FETCH_COUNT} most recent emails`);

  // Step 1: Fetch recent message IDs from Gmail
  const recentMessageRefs: Array<{ id: string; threadId: string }> = [];
  let pageToken: string | undefined;
  const query = '-in:sent -in:drafts -in:trash -in:spam';

  while (recentMessageRefs.length < INCREMENTAL_FETCH_COUNT) {
    const response = await listMessages(accessToken, {
      maxResults: Math.min(100, INCREMENTAL_FETCH_COUNT - recentMessageRefs.length),
      pageToken,
      q: query,
    });

    if (!response.messages || response.messages.length === 0) break;
    recentMessageRefs.push(...response.messages);

    if (!response.nextPageToken) break;
    pageToken = response.nextPageToken;
  }

  const gmailMessageIds = recentMessageRefs.map(m => m.id);
  console.log(`Incremental sync: found ${gmailMessageIds.length} recent messages in Gmail`);

  // Step 2: Find which messages we already have in DB
  const { data: existingEmails } = await supabase
    .from('emails')
    .select('gmail_message_id')
    .eq('email_account_id', accountId)
    .in('gmail_message_id', gmailMessageIds);

  const existingIds = new Set((existingEmails || []).map(e => e.gmail_message_id));
  const newMessageIds = gmailMessageIds.filter(id => !existingIds.has(id));
  console.log(`Incremental sync: ${newMessageIds.length} new emails to add`);

  // Step 3: Fetch and insert new emails
  let addedCount = 0;
  const affectedSenders = new Set<string>();

  if (newMessageIds.length > 0) {
    const requiredHeaders = ['From', 'Date', 'Subject', 'List-Unsubscribe'];
    const newMessages = await batchGetMessages(accessToken, newMessageIds, 'metadata', requiredHeaders);

    for (const msg of newMessages) {
      const labels = msg.labelIds || [];
      if (labels.includes('SPAM') || labels.includes('TRASH')) continue;

      const fromHeader = msg.payload?.headers?.find((h: any) => h.name === 'From')?.value || '';
      const dateHeader = msg.payload?.headers?.find((h: any) => h.name === 'Date')?.value || '';
      const subjectHeader = msg.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '';

      const { senderEmail, senderName } = parseSender(fromHeader);
      if (senderEmail === userEmail || !senderEmail) continue;

      const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : new Date(parseInt(msg.internalDate)).toISOString();

      // Insert email (unique constraint will reject duplicates)
      const { error } = await supabase.from('emails').insert({
        gmail_message_id: msg.id,
        email_account_id: accountId,
        sender_email: senderEmail,
        sender_name: senderName,
        subject: subjectHeader || '(No Subject)',
        snippet: msg.snippet || '',
        received_at: receivedAt,
        is_unread: labels.includes('UNREAD'),
        thread_id: msg.threadId,
        labels,
      });

      if (!error) {
        addedCount++;
        affectedSenders.add(`${senderEmail}|||${senderName}`);
      }
    }
  }

  // Step 4: Detect and remove deleted emails
  // Compare what's in DB vs what's in Gmail's recent messages
  const gmailIdSet = new Set(gmailMessageIds);
  const { data: dbRecentEmails } = await supabase
    .from('emails')
    .select('id, gmail_message_id, sender_email, sender_name')
    .eq('email_account_id', accountId)
    .order('received_at', { ascending: false })
    .limit(INCREMENTAL_FETCH_COUNT);

  const orphanedEmails = (dbRecentEmails || []).filter(e => !gmailIdSet.has(e.gmail_message_id));
  let deletedCount = 0;

  if (orphanedEmails.length > 0) {
    console.log(`Incremental sync: removing ${orphanedEmails.length} deleted emails`);
    const orphanIds = orphanedEmails.map(e => e.id);
    await supabase.from('emails').delete().in('id', orphanIds);
    deletedCount = orphanedEmails.length;

    // Track affected senders for recount
    for (const e of orphanedEmails) {
      affectedSenders.add(`${e.sender_email}|||${e.sender_name}`);
    }
  }

  // Step 5: Recalculate sender stats for affected senders
  if (affectedSenders.size > 0) {
    console.log(`Incremental sync: recalculating stats for ${affectedSenders.size} senders`);
    const senderKeys = Array.from(affectedSenders);
    for (const key of senderKeys) {
      const [senderEmail, senderName] = key.split('|||');
      await recalculateSenderStats(userId, accountId, senderEmail, senderName);
    }
  }

  // Step 6: Get new historyId
  let historyId: string | undefined;
  try {
    const profile = await getProfile(accessToken);
    historyId = profile.historyId;
  } catch (e) {
    console.warn('Could not get historyId:', e);
  }

  // Step 7: Update account
  await supabase
    .from('email_accounts')
    .update({
      last_synced: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(historyId && { history_id: historyId })
    })
    .eq('id', accountId);

  // Log activity
  const description = `Incremental sync: ${addedCount} new, ${deletedCount} removed`;
  await supabase.from('activity_log').insert({
    user_id: userId,
    action_type: 'email_sync',
    description,
    metadata: { email, syncType: 'incremental', addedEmails: addedCount, deletedEmails: deletedCount }
  });

  return res.status(200).json({
    success: true,
    totalSenders: affectedSenders.size,
    addedEmails: addedCount,
    deletedEmails: deletedCount,
    message: addedCount > 0 || deletedCount > 0 ? description : 'No new changes',
    syncType: 'incremental'
  });
}

/**
 * Recalculate sender stats from actual email data
 */
async function recalculateSenderStats(
  userId: string,
  accountId: string,
  senderEmail: string,
  senderName: string
) {
  // Get all emails for this sender
  const { data: emails } = await supabase
    .from('emails')
    .select('received_at, is_unread')
    .eq('email_account_id', accountId)
    .eq('sender_email', senderEmail)
    .eq('sender_name', senderName)
    .order('received_at', { ascending: false });

  if (!emails || emails.length === 0) {
    // No emails left - delete sender
    await supabase
      .from('email_senders')
      .delete()
      .eq('email_account_id', accountId)
      .eq('sender_email', senderEmail)
      .eq('sender_name', senderName);
    return;
  }

  const emailCount = emails.length;
  const unreadCount = emails.filter(e => e.is_unread).length;
  const lastEmailDate = emails[0].received_at;
  const firstEmailDate = emails[emails.length - 1].received_at;

  // Check if sender exists
  const { data: existingSender } = await supabase
    .from('email_senders')
    .select('id')
    .eq('email_account_id', accountId)
    .eq('sender_email', senderEmail)
    .eq('sender_name', senderName)
    .single();

  if (existingSender) {
    // Update existing sender
    await supabase
      .from('email_senders')
      .update({
        email_count: emailCount,
        unread_count: unreadCount,
        first_email_date: firstEmailDate,
        last_email_date: lastEmailDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSender.id);
  } else {
    // Create new sender
    await supabase.from('email_senders').insert({
      user_id: userId,
      email_account_id: accountId,
      sender_email: senderEmail,
      sender_name: senderName,
      email_count: emailCount,
      unread_count: unreadCount,
      first_email_date: firstEmailDate,
      last_email_date: lastEmailDate,
      has_unsubscribe: false,
      is_newsletter: false,
      is_promotional: false,
      updated_at: new Date().toISOString()
    });
  }
}

/**
 * Parse sender email and name from From header
 */
function parseSender(fromHeader: string): { senderEmail: string; senderName: string } {
  if (!fromHeader) return { senderEmail: '', senderName: '' };

  // Handle formats like:
  // "John Doe <john@example.com>"
  // John Doe <john@example.com>
  // <john@example.com>
  // john@example.com
  const emailMatch = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s<]+@[^\s>]+)/);
  const senderEmail = emailMatch ? emailMatch[1].toLowerCase() : fromHeader.toLowerCase();

  const nameMatch = fromHeader.match(/^"?([^"<]+)"?\s*</) || fromHeader.match(/^([^<@]+)(?=@)/);
  const senderName = nameMatch ? nameMatch[1].trim() : senderEmail;

  return { senderEmail, senderName };
}

/**
 * Extract unsubscribe link from List-Unsubscribe header
 */
function extractUnsubscribeLink(header: string): string | null {
  if (!header) return null;

  // Prefer HTTPS links over mailto
  const httpMatch = header.match(/<(https?:\/\/[^>]+)>/);
  if (httpMatch) return httpMatch[1];

  const mailtoMatch = header.match(/<(mailto:[^>]+)>/);
  if (mailtoMatch) return mailtoMatch[1];

  return null;
}
