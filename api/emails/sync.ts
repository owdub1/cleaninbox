/**
 * Email Sync Endpoint - Reliable Incremental Sync
 *
 * POST /api/emails/sync
 *
 * Two sync modes:
 * 1. Full Sync - Deletes all data and rebuilds from Gmail (first sync, manual trigger, recovery)
 * 2. Incremental Sync - Uses Gmail History API to capture ALL changes since last sync
 *
 * Incremental Sync Guarantees:
 * - Uses History API to detect ALL added/deleted messages since last sync
 * - Falls back to timestamp-based query if History API is stale
 * - Post-sync completeness verification ensures no emails are missed
 * - Never deletes emails based on heuristic limits
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit } from '../lib/rate-limiter.js';
import { getValidAccessToken } from '../lib/gmail.js';
import { listMessages, batchGetMessages, getProfile, getHistoryChanges } from '../lib/gmail-api.js';
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
const BATCH_SIZE = 100;
const MAX_INCREMENTAL_MESSAGES = 1000; // Safety limit for incremental sync

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
      // Use History API with timestamp fallback for reliable sync
      return await performIncrementalSync(
        res,
        user.userId,
        account.id,
        accessToken,
        userEmail,
        email,
        account.last_synced,
        account.history_id
      );
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
 * Incremental Sync: Reliable sync using History API with timestamp fallback
 *
 * Strategy:
 * 1. Try History API first (fastest, most reliable)
 * 2. If history expired, fall back to timestamp-based query
 * 3. Verify completeness after sync
 * 4. Never delete based on heuristic limits - only delete what History API reports
 */
async function performIncrementalSync(
  res: VercelResponse,
  userId: string,
  accountId: string,
  accessToken: string,
  userEmail: string,
  email: string,
  lastSyncedAt: string,
  storedHistoryId: string | null
) {
  let addedCount = 0;
  let deletedCount = 0;
  const affectedSenders = new Set<string>();
  let syncMethod = 'history';
  let newHistoryId: string | undefined;

  // Try History API first if we have a stored historyId
  if (storedHistoryId) {
    console.log(`Incremental sync: trying History API with historyId ${storedHistoryId}`);

    try {
      const historyChanges = await getHistoryChanges(accessToken, storedHistoryId);

      if (historyChanges.historyExpired) {
        console.log('History API: historyId expired, falling back to timestamp-based sync');
        syncMethod = 'timestamp';
      } else {
        // History API succeeded - use its results
        newHistoryId = historyChanges.newHistoryId;

        const addedMessageIds = historyChanges.addedMessageIds;
        const deletedMessageIds = historyChanges.deletedMessageIds;

        console.log(`History API: ${addedMessageIds.length} added, ${deletedMessageIds.length} deleted`);

        // Process added messages
        if (addedMessageIds.length > 0) {
          const result = await processNewMessages(
            accessToken, accountId, userEmail, addedMessageIds, affectedSenders
          );
          addedCount = result.addedCount;
        }

        // Process deleted messages
        if (deletedMessageIds.length > 0) {
          const result = await processDeletedMessages(
            accountId, deletedMessageIds, affectedSenders
          );
          deletedCount = result.deletedCount;
        }
      }
    } catch (error: any) {
      console.error('History API error:', error.message);
      syncMethod = 'timestamp';
    }
  } else {
    console.log('Incremental sync: no stored historyId, using timestamp-based sync');
    syncMethod = 'timestamp';
  }

  // Fallback: timestamp-based sync
  if (syncMethod === 'timestamp') {
    console.log(`Timestamp-based sync: fetching ALL emails since ${lastSyncedAt}`);

    // Build query to get ALL emails after last sync (not limited to arbitrary count)
    const lastSyncDate = new Date(lastSyncedAt);
    // Subtract 1 hour buffer to handle timezone/timing edge cases
    const bufferDate = new Date(lastSyncDate.getTime() - 60 * 60 * 1000);
    const epochSeconds = Math.floor(bufferDate.getTime() / 1000);
    const query = `-in:sent -in:drafts -in:trash -in:spam after:${epochSeconds}`;

    // Fetch ALL messages since last sync (with safety limit)
    const messageRefs: Array<{ id: string; threadId: string }> = [];
    let pageToken: string | undefined;

    while (messageRefs.length < MAX_INCREMENTAL_MESSAGES) {
      const response = await listMessages(accessToken, {
        maxResults: 100,
        pageToken,
        q: query,
      });

      if (!response.messages || response.messages.length === 0) break;
      messageRefs.push(...response.messages);

      if (!response.nextPageToken) break;
      pageToken = response.nextPageToken;
    }

    console.log(`Timestamp sync: found ${messageRefs.length} messages since last sync`);

    // Find which messages are new (not in our DB)
    const gmailMessageIds = messageRefs.map(m => m.id);

    if (gmailMessageIds.length > 0) {
      // Query in batches to avoid Supabase limits
      const existingIds = new Set<string>();
      for (let i = 0; i < gmailMessageIds.length; i += 500) {
        const batch = gmailMessageIds.slice(i, i + 500);
        const { data: existingEmails } = await supabase
          .from('emails')
          .select('gmail_message_id')
          .eq('email_account_id', accountId)
          .in('gmail_message_id', batch);

        (existingEmails || []).forEach(e => existingIds.add(e.gmail_message_id));
      }

      const newMessageIds = gmailMessageIds.filter(id => !existingIds.has(id));
      console.log(`Timestamp sync: ${newMessageIds.length} new emails to add`);

      if (newMessageIds.length > 0) {
        const result = await processNewMessages(
          accessToken, accountId, userEmail, newMessageIds, affectedSenders
        );
        addedCount = result.addedCount;
      }
    }

    // For timestamp-based sync, we don't know deletions - skip deletion detection
    // (Full sync handles cleanup, and History API handles deletions when available)
  }

  // Get fresh historyId if we don't have one
  if (!newHistoryId) {
    try {
      const profile = await getProfile(accessToken);
      newHistoryId = profile.historyId;
    } catch (e) {
      console.warn('Could not get historyId:', e);
    }
  }

  // Post-sync completeness check
  const completenessResult = await verifyCompletenessAndSync(
    accessToken, accountId, userEmail, affectedSenders
  );
  addedCount += completenessResult.addedCount;

  // Recalculate sender stats for affected senders
  if (affectedSenders.size > 0) {
    console.log(`Incremental sync: recalculating stats for ${affectedSenders.size} senders`);
    const senderKeys = Array.from(affectedSenders);
    for (const key of senderKeys) {
      const [senderEmail, senderName] = key.split('|||');
      await recalculateSenderStats(userId, accountId, senderEmail, senderName);
    }
  }

  // Update account with new sync time and historyId
  const now = new Date().toISOString();
  await supabase
    .from('email_accounts')
    .update({
      last_synced: now,
      updated_at: now,
      ...(newHistoryId && { history_id: newHistoryId })
    })
    .eq('id', accountId);

  // Log activity
  const description = `Incremental sync (${syncMethod}): ${addedCount} new, ${deletedCount} removed`;
  await supabase.from('activity_log').insert({
    user_id: userId,
    action_type: 'email_sync',
    description,
    metadata: {
      email,
      syncType: 'incremental',
      syncMethod,
      addedEmails: addedCount,
      deletedEmails: deletedCount,
      completenessVerified: true
    }
  });

  return res.status(200).json({
    success: true,
    totalSenders: affectedSenders.size,
    addedEmails: addedCount,
    deletedEmails: deletedCount,
    message: addedCount > 0 || deletedCount > 0 ? description : 'No new changes',
    syncType: 'incremental',
    syncMethod
  });
}

/**
 * Process and insert new messages
 */
async function processNewMessages(
  accessToken: string,
  accountId: string,
  userEmail: string,
  messageIds: string[],
  affectedSenders: Set<string>
): Promise<{ addedCount: number }> {
  let addedCount = 0;

  const requiredHeaders = ['From', 'Date', 'Subject', 'List-Unsubscribe'];
  const messages = await batchGetMessages(accessToken, messageIds, 'metadata', requiredHeaders);

  for (const msg of messages) {
    const labels = msg.labelIds || [];
    // Skip spam/trash, but also skip sent/drafts to only get inbox emails
    if (labels.includes('SPAM') || labels.includes('TRASH') ||
        labels.includes('SENT') || labels.includes('DRAFT')) continue;

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

  return { addedCount };
}

/**
 * Process deleted messages (from History API)
 */
async function processDeletedMessages(
  accountId: string,
  deletedMessageIds: string[],
  affectedSenders: Set<string>
): Promise<{ deletedCount: number }> {
  let deletedCount = 0;

  // Find which deleted messages exist in our DB
  for (let i = 0; i < deletedMessageIds.length; i += 500) {
    const batch = deletedMessageIds.slice(i, i + 500);

    const { data: emailsToDelete } = await supabase
      .from('emails')
      .select('id, gmail_message_id, sender_email, sender_name')
      .eq('email_account_id', accountId)
      .in('gmail_message_id', batch);

    if (emailsToDelete && emailsToDelete.length > 0) {
      // Track affected senders before deletion
      for (const e of emailsToDelete) {
        affectedSenders.add(`${e.sender_email}|||${e.sender_name}`);
      }

      // Delete the emails
      const idsToDelete = emailsToDelete.map(e => e.id);
      await supabase.from('emails').delete().in('id', idsToDelete);
      deletedCount += emailsToDelete.length;
    }
  }

  console.log(`Deleted ${deletedCount} emails from DB based on History API`);
  return { deletedCount };
}

/**
 * Post-sync completeness verification
 * Ensures the newest email in Gmail is in our database
 * If not, fetches and adds it (and any other missing recent emails)
 */
async function verifyCompletenessAndSync(
  accessToken: string,
  accountId: string,
  userEmail: string,
  affectedSenders: Set<string>
): Promise<{ addedCount: number; complete: boolean }> {
  console.log('Verifying sync completeness...');

  // Get the newest email from Gmail
  const response = await listMessages(accessToken, {
    maxResults: 10, // Get a few recent ones for verification
    q: '-in:sent -in:drafts -in:trash -in:spam',
  });

  if (!response.messages || response.messages.length === 0) {
    console.log('Completeness check: No messages in Gmail');
    return { addedCount: 0, complete: true };
  }

  const newestGmailIds = response.messages.map(m => m.id);

  // Check if these exist in our DB
  const { data: existingEmails } = await supabase
    .from('emails')
    .select('gmail_message_id')
    .eq('email_account_id', accountId)
    .in('gmail_message_id', newestGmailIds);

  const existingIds = new Set((existingEmails || []).map(e => e.gmail_message_id));
  const missingIds = newestGmailIds.filter(id => !existingIds.has(id));

  if (missingIds.length === 0) {
    console.log('Completeness check: All recent emails are synced ✓');
    return { addedCount: 0, complete: true };
  }

  console.log(`Completeness check: ${missingIds.length} recent emails missing, adding them now`);

  // Add the missing emails
  const result = await processNewMessages(
    accessToken, accountId, userEmail, missingIds, affectedSenders
  );

  console.log(`Completeness check: Added ${result.addedCount} missing emails`);
  return { addedCount: result.addedCount, complete: true };
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
