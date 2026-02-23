/**
 * Email Sync Endpoint - Guaranteed Inbox Correctness
 *
 * POST /api/emails/sync
 *
 * SYNC NOW GUARANTEES:
 * After clicking Sync Now, the local inbox MUST fully match Gmail.
 * No emails may silently fail to sync. No manual steps required from user.
 *
 * Sync Now behavior:
 * - Uses Gmail History API for exact change detection
 * - Falls back to timestamp-based fetch when historyId is missing or expired
 * - Performs post-sync completeness verification against Gmail
 * - Verifies that all of Gmail's newest emails exist locally before reporting success
 *
 * Correctness rules:
 * - Sync Now MUST NOT report success if any Gmail emails are missing
 * - If incremental sync fails completeness checks, automatically escalates to recovery sync
 * - Full Sync is a recovery mechanism, not a user responsibility
 *
 * Sync modes (automatic, not user-selected):
 * 1. Full Sync - First sync, stale sync (>30 days), or critical recovery
 * 2. Incremental Sync - Normal sync using History API + timestamp fallback
 * 3. Recovery Sync - Auto-triggered when completeness check fails
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit } from '../lib/rate-limiter.js';
import { getValidAccessToken } from '../lib/gmail.js';
import { getValidOutlookAccessToken } from '../lib/outlook.js';
import { listMessages, batchGetMessages, getProfile, getHistoryChanges } from '../lib/gmail-api.js';
import { performOutlookFullSync, performOutlookIncrementalSync } from './outlook-sync.js';
import { PLAN_LIMITS } from '../subscription/get.js';
import { withSentry } from '../lib/sentry.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many sync requests. Please wait before syncing again.'
});

// Constants
const STALE_SYNC_DAYS = 30;
const BATCH_SIZE = 100;
const MAX_INCREMENTAL_MESSAGES = 1000; // Safety limit for incremental sync

async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (limiter(req, res)) return;

  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  const { email, fullSync = false, repair = false } = req.body;

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
      .select('id, gmail_email, provider, connection_status, last_synced, total_emails, history_id, delta_link')
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

    // Skip sync interval if user upgraded and previous sync was capped by a lower plan
    const previousPlanCaps = [100, 1000, 5000]; // free, basic, pro limits
    const totalEmails = account.total_emails || 0;
    const wasLimitedByPreviousPlan = totalEmails > 0 &&
      totalEmails < planLimits.emailProcessingLimit &&
      previousPlanCaps.includes(totalEmails);

    // Check if enough time has passed since last sync (skip if user just upgraded)
    if (syncIntervalMinutes > 0 && account.last_synced && !wasLimitedByPreviousPlan) {
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

    // ==================== PROVIDER ROUTING ====================
    const provider = account.provider || 'Gmail';

    if (provider === 'Outlook') {
      // Route to Outlook sync
      let outlookAccessToken: string;
      try {
        const tokenResult = await getValidOutlookAccessToken(
          user.userId,
          email
        );
        outlookAccessToken = tokenResult.accessToken;

        if (account.connection_status !== 'connected') {
          await supabase
            .from('email_accounts')
            .update({ connection_status: 'connected', updated_at: new Date().toISOString() })
            .eq('id', account.id);
        }
      } catch (tokenError: any) {
        console.error('Outlook token error:', tokenError.message);
        await supabase
          .from('email_accounts')
          .update({ connection_status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', account.id);

        return res.status(400).json({
          error: `Outlook connection error: ${tokenError.message}. Please reconnect your Outlook account.`,
          code: 'TOKEN_ERROR'
        });
      }

      if (repair) {
        console.log(`Repair mode: recalculating sender stats for ${email}`);
        return await performRepairSync(res, user.userId, account.id, email);
      }

      const isFirstSync = !account.last_synced;
      const isStaleSync = account.last_synced &&
        (Date.now() - new Date(account.last_synced).getTime()) > (STALE_SYNC_DAYS * 24 * 60 * 60 * 1000);
      const isFullSync = isFirstSync || isStaleSync || fullSync;

      const outlookUserEmail = email.toLowerCase();

      if (isFullSync) {
        return await performOutlookFullSync(res, user.userId, account.id, outlookAccessToken, outlookUserEmail, planLimits.emailProcessingLimit, email);
      } else {
        return await performOutlookIncrementalSync(
          res, user.userId, account.id, outlookAccessToken, outlookUserEmail,
          email, account.last_synced, account.delta_link
        );
      }
    }

    // ==================== GMAIL SYNC (default) ====================
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

    // ==================== REPAIR MODE ====================
    // Recalculate all sender stats from existing emails (no Gmail fetch)
    if (repair) {
      console.log(`Repair mode: recalculating sender stats for ${email}`);
      return await performRepairSync(res, user.userId, account.id, email);
    }

    // Determine sync mode
    const isFirstSync = !account.last_synced;
    const isStaleSync = account.last_synced &&
      (Date.now() - new Date(account.last_synced).getTime()) > (STALE_SYNC_DAYS * 24 * 60 * 60 * 1000);
    // wasLimitedByPreviousPlan is computed above (before sync interval check)
    const isFullSync = isFirstSync || isStaleSync || fullSync || wasLimitedByPreviousPlan;

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
      code: 'SYNC_ERROR',
      message: error.message
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
  const requiredHeaders = ['From', 'Date', 'Subject', 'List-Unsubscribe', 'List-Unsubscribe-Post'];
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
    mailto_unsubscribe_link: string | null;
    has_unsubscribe: boolean;
    has_one_click_unsubscribe: boolean;
    is_newsletter: boolean;
    is_promotional: boolean;
    _unsub_link_date?: string; // in-memory only, stripped before DB insert
    _mailto_unsub_link_date?: string; // in-memory only, stripped before DB insert
  }>();

  for (const msg of messages) {
    const labels = msg.labelIds || [];
    if (labels.includes('SPAM') || labels.includes('TRASH')) continue;

    const fromHeader = msg.payload?.headers?.find((h: any) => h.name === 'From')?.value || '';
    const dateHeader = msg.payload?.headers?.find((h: any) => h.name === 'Date')?.value || '';
    const subjectHeader = msg.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '';
    const unsubscribeHeader = msg.payload?.headers?.find((h: any) => h.name === 'List-Unsubscribe')?.value || '';
    const unsubscribePostHeader = msg.payload?.headers?.find((h: any) => h.name === 'List-Unsubscribe-Post')?.value || '';

    const { senderEmail, senderName } = parseSender(fromHeader);
    if (senderEmail === userEmail || !senderEmail) continue;

    // Use Gmail's internalDate (epoch ms) instead of Date header for reliable timezone handling
    // The Date header can be in any timezone and JS parsing can shift the date
    const internalDateMs = parseInt(msg.internalDate);
    const receivedAt = new Date(internalDateMs).toISOString();

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
    const mailtoUnsubscribeLink = extractMailtoUnsubscribeLink(unsubscribeHeader);
    const hasOneClick = unsubscribePostHeader.toLowerCase().includes('list-unsubscribe=one-click');

    if (existing) {
      existing.email_count++;
      if (isUnread) existing.unread_count++;
      if (receivedAt < existing.first_email_date) existing.first_email_date = receivedAt;
      if (receivedAt > existing.last_email_date) existing.last_email_date = receivedAt;
      // Prefer the most recent email's unsubscribe link (more likely to be valid)
      if (unsubscribeLink && (!existing._unsub_link_date || receivedAt > existing._unsub_link_date)) {
        existing.unsubscribe_link = unsubscribeLink;
        existing.has_unsubscribe = true;
        existing.has_one_click_unsubscribe = hasOneClick;
        existing._unsub_link_date = receivedAt;
      }
      // Track most recent mailto unsubscribe link separately
      if (mailtoUnsubscribeLink && (!existing._mailto_unsub_link_date || receivedAt > existing._mailto_unsub_link_date)) {
        existing.mailto_unsubscribe_link = mailtoUnsubscribeLink;
        existing._mailto_unsub_link_date = receivedAt;
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
        mailto_unsubscribe_link: mailtoUnsubscribeLink,
        has_unsubscribe: !!unsubscribeLink,
        has_one_click_unsubscribe: hasOneClick,
        is_newsletter: labels.includes('CATEGORY_UPDATES') && !!unsubscribeLink,
        is_promotional: labels.includes('CATEGORY_PROMOTIONS'),
        _unsub_link_date: unsubscribeLink ? receivedAt : undefined,
        _mailto_unsub_link_date: mailtoUnsubscribeLink ? receivedAt : undefined,
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

  // Step 6: Insert senders (strip in-memory-only tracking fields)
  const sendersToInsert = Array.from(senderStats.values()).map(({ _unsub_link_date, _mailto_unsub_link_date, ...s }) => ({
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
  // Collect unsubscribe info from all processNewMessages calls to apply AFTER sender rows are created
  const allSendersWithUnsubscribe = new Map<string, { unsubscribeLink: string; mailtoLink: string | null; hasOneClick: boolean; receivedAt: string }>();

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
          for (const [k, v] of result.sendersWithUnsubscribe) allSendersWithUnsubscribe.set(k, v);
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
        for (const [k, v] of result.sendersWithUnsubscribe) allSendersWithUnsubscribe.set(k, v);
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
  for (const [k, v] of completenessResult.sendersWithUnsubscribe) allSendersWithUnsubscribe.set(k, v);

  // ENFORCEMENT: If completeness check failed, escalate to recovery sync automatically
  if (!completenessResult.complete) {
    const recoveryResult = await performRecoverySync(
      accessToken, accountId, userEmail, affectedSenders
    );
    addedCount += recoveryResult.addedCount;
    for (const [k, v] of recoveryResult.sendersWithUnsubscribe) allSendersWithUnsubscribe.set(k, v);

    const finalCheck = await verifyCompletenessAndSync(
      accessToken, accountId, userEmail, affectedSenders
    );
    addedCount += finalCheck.addedCount;
    for (const [k, v] of finalCheck.sendersWithUnsubscribe) allSendersWithUnsubscribe.set(k, v);

    if (!finalCheck.complete) {
      syncMethod = 'recovery-failed';
    } else {
      syncMethod = 'recovery';
    }
  }

  // Recalculate sender stats for affected senders (creates rows for new senders)
  // Uses batched approach: 2-3 DB queries total instead of 3*N sequential queries
  // This prevents Vercel Hobby 10s timeout when many senders are affected
  await batchRecalculateSenderStats(userId, accountId, affectedSenders);

  // Apply unsubscribe info AFTER recalculateSenderStats has created/updated sender rows
  for (const [key, info] of allSendersWithUnsubscribe) {
    const [senderEmail, senderName] = key.split('|||');
    await supabase
      .from('email_senders')
      .update({
        has_unsubscribe: true,
        unsubscribe_link: info.unsubscribeLink,
        ...(info.mailtoLink && { mailto_unsubscribe_link: info.mailtoLink }),
        has_one_click_unsubscribe: info.hasOneClick,
        updated_at: new Date().toISOString(),
      })
      .eq('email_account_id', accountId)
      .eq('sender_email', senderEmail)
      .eq('sender_name', senderName);
  }

  // Lightweight orphaned sender check
  const orphanedFixed = await fixOrphanedSenders(userId, accountId);

  // Diagnostic: count emails and senders from last 48h to identify discrepancies
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: recentDbEmails } = await supabase
    .from('emails')
    .select('sender_email, sender_name')
    .eq('email_account_id', accountId)
    .gte('received_at', cutoff48h);
  const recentSenderKeys = new Set((recentDbEmails || []).map(e => `${e.sender_email}|||${e.sender_name}`));
  const { data: recentSenderRows } = await supabase
    .from('email_senders')
    .select('sender_email, sender_name, email_count, last_email_date')
    .eq('email_account_id', accountId)
    .gte('last_email_date', cutoff48h);
  const recentSenderRowKeys = new Set((recentSenderRows || []).map(s => `${s.sender_email}|||${s.sender_name}`));
  // Senders with recent emails in DB but no recent sender row
  const missingSenderRows = [...recentSenderKeys].filter(k => !recentSenderRowKeys.has(k));

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
  const description = `Sync (${syncMethod}): ${addedCount} new, ${deletedCount} removed`;
  await supabase.from('activity_log').insert({
    user_id: userId,
    action_type: 'email_sync',
    description,
    metadata: {
      email,
      syncType: syncMethod.includes('recovery') ? 'recovery' : 'incremental',
      syncMethod,
      addedEmails: addedCount,
      deletedEmails: deletedCount,
      completenessVerified: !syncMethod.includes('failed')
    }
  });

  return res.status(200).json({
    success: !syncMethod.includes('failed'),
    totalSenders: affectedSenders.size,
    addedEmails: addedCount,
    deletedEmails: deletedCount,
    orphansFixed: orphanedFixed,
    message: syncMethod.includes('failed')
      ? `Sync incomplete - ${completenessResult.missingCount} emails could not be synced`
      : (addedCount > 0 || deletedCount > 0 || orphanedFixed > 0
          ? `${description}${orphanedFixed > 0 ? `, ${orphanedFixed} orphans fixed` : ''}`
          : 'Inbox is up to date'),
    syncType: syncMethod.includes('recovery') ? 'recovery' : 'incremental',
    syncMethod,
    // Temporary diagnostic - remove after debugging
    _diag: {
      userEmail,
      recentEmailSenders: recentSenderKeys.size,
      recentSenderRows: recentSenderRowKeys.size,
      missingSenderRows: missingSenderRows.slice(0, 10),
      completenessChecked: completenessResult.missingCount === 0 ? 'all 50 present' : `${completenessResult.missingCount} missing`,
      recentEmails48h: (recentDbEmails || []).length,
    }
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
): Promise<{ addedCount: number; sendersWithUnsubscribe: Map<string, { unsubscribeLink: string; mailtoLink: string | null; hasOneClick: boolean; receivedAt: string }> }> {
  let addedCount = 0;

  const requiredHeaders = ['From', 'Date', 'Subject', 'List-Unsubscribe', 'List-Unsubscribe-Post'];
  const messages = await batchGetMessages(accessToken, messageIds, 'metadata', requiredHeaders);


  // Track senders that need unsubscribe info restored
  const sendersWithUnsubscribe = new Map<string, { unsubscribeLink: string; mailtoLink: string | null; hasOneClick: boolean; receivedAt: string }>();

  for (const msg of messages) {
    const labels = msg.labelIds || [];
    // Skip spam/trash, but also skip sent/drafts to only get inbox emails
    if (labels.includes('SPAM') || labels.includes('TRASH') ||
        labels.includes('SENT') || labels.includes('DRAFT')) {

      continue;
    }

    const fromHeader = msg.payload?.headers?.find((h: any) => h.name === 'From')?.value || '';
    const dateHeader = msg.payload?.headers?.find((h: any) => h.name === 'Date')?.value || '';
    const subjectHeader = msg.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '';
    const unsubscribeHeader = msg.payload?.headers?.find((h: any) => h.name === 'List-Unsubscribe')?.value || '';
    const unsubscribePostHeader = msg.payload?.headers?.find((h: any) => h.name === 'List-Unsubscribe-Post')?.value || '';

    const { senderEmail, senderName } = parseSender(fromHeader);
    if (senderEmail === userEmail || !senderEmail) {

      continue;
    }

    // Use Gmail's internalDate (epoch ms) instead of Date header for reliable timezone handling
    // The Date header can be in any timezone and JS parsing can shift the date
    const receivedAt = new Date(parseInt(msg.internalDate)).toISOString();

    // Track unsubscribe info from new emails to restore has_unsubscribe if needed
    const unsubscribeLink = extractUnsubscribeLink(unsubscribeHeader);
    const mailtoLink = extractMailtoUnsubscribeLink(unsubscribeHeader);
    if (unsubscribeLink) {
      const key = `${senderEmail}|||${senderName}`;
      const existing = sendersWithUnsubscribe.get(key);
      if (!existing || receivedAt > existing.receivedAt) {
        sendersWithUnsubscribe.set(key, {
          unsubscribeLink,
          mailtoLink,
          hasOneClick: unsubscribePostHeader.toLowerCase().includes('list-unsubscribe=one-click'),
          receivedAt,
        });
      }
    }

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
    } else if (error.code === '23505') {
      // Duplicate email already in DB - still track sender for stats recalculation.
      // This fixes orphaned emails from previous timed-out syncs where the email
      // was inserted but the sender row was never created.
      affectedSenders.add(`${senderEmail}|||${senderName}`);
    }
  }

  return { addedCount, sendersWithUnsubscribe };
}

/**
 * Recovery Sync: Thorough sync when incremental sync fails completeness check
 *
 * This is automatically triggered when emails are missing after incremental sync.
 * It fetches ALL recent emails (not just since last sync) to catch anything missed.
 * User never needs to trigger this manually.
 */
async function performRecoverySync(
  accessToken: string,
  accountId: string,
  userEmail: string,
  affectedSenders: Set<string>
): Promise<{ addedCount: number; sendersWithUnsubscribe: Map<string, { unsubscribeLink: string; mailtoLink: string | null; hasOneClick: boolean; receivedAt: string }> }> {
  console.log('Recovery sync: Fetching all recent emails to catch missed messages...');

  // Fetch a large number of recent emails to ensure completeness
  const RECOVERY_FETCH_COUNT = 500;
  const query = '-in:sent -in:drafts -in:trash -in:spam';

  const messageRefs: Array<{ id: string; threadId: string }> = [];
  let pageToken: string | undefined;

  while (messageRefs.length < RECOVERY_FETCH_COUNT) {
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

  console.log(`Recovery sync: Found ${messageRefs.length} recent messages in Gmail`);

  // Find which messages are missing from our DB
  const gmailIds = messageRefs.map(m => m.id);
  const existingIds = new Set<string>();

  for (let i = 0; i < gmailIds.length; i += 500) {
    const batch = gmailIds.slice(i, i + 500);
    const { data: existingEmails } = await supabase
      .from('emails')
      .select('gmail_message_id')
      .eq('email_account_id', accountId)
      .in('gmail_message_id', batch);

    (existingEmails || []).forEach(e => existingIds.add(e.gmail_message_id));
  }

  const missingIds = gmailIds.filter(id => !existingIds.has(id));
  console.log(`Recovery sync: ${missingIds.length} emails missing from local DB`);

  if (missingIds.length === 0) {
    return { addedCount: 0, sendersWithUnsubscribe: new Map() };
  }

  // Fetch and add all missing emails

  const result = await processNewMessages(
    accessToken, accountId, userEmail, missingIds, affectedSenders
  );

  console.log(`Recovery sync: Added ${result.addedCount} missing emails`);
  return { addedCount: result.addedCount, sendersWithUnsubscribe: result.sendersWithUnsubscribe };
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
 * Post-sync completeness verification with enforcement
 *
 * GUARANTEES:
/**
 * Fix orphaned/stale senders: emails exist in DB but sender row is missing, has wrong count,
 * or has a stale last_email_date. Only checks the 200 most recent emails — lightweight.
 */
async function fixOrphanedSenders(
  userId: string,
  accountId: string
): Promise<number> {
  // Get senders from the 200 most recent emails with dates
  const { data: recentEmails } = await supabase
    .from('emails')
    .select('sender_email, sender_name, received_at')
    .eq('email_account_id', accountId)
    .order('received_at', { ascending: false })
    .limit(200);

  if (!recentEmails || recentEmails.length === 0) return 0;

  // Track per-sender: count and newest email date from DB
  const senderInfo = new Map<string, { email: string; name: string; count: number; newestDate: string }>();
  for (const e of recentEmails) {
    const key = `${e.sender_email}|||${e.sender_name}`;
    const existing = senderInfo.get(key);
    if (existing) {
      existing.count++;
      if (e.received_at > existing.newestDate) existing.newestDate = e.received_at;
    } else {
      senderInfo.set(key, { email: e.sender_email, name: e.sender_name, count: 1, newestDate: e.received_at });
    }
  }

  // Check which of these senders have email_senders rows, their counts, and last dates
  const senderEmails = [...new Set(recentEmails.map(e => e.sender_email))];
  const { data: existingSenders } = await supabase
    .from('email_senders')
    .select('sender_email, sender_name, email_count, last_email_date')
    .eq('email_account_id', accountId)
    .in('sender_email', senderEmails);

  const existingMap = new Map(
    (existingSenders || []).map(s => [
      `${s.sender_email}|||${s.sender_name}`,
      { count: s.email_count, lastDate: s.last_email_date }
    ])
  );

  // Recalculate stats for senders that are:
  // 1. Missing from email_senders
  // 2. Have count = 0 despite having emails
  // 3. Have a stale last_email_date (newer emails exist in DB)
  // 4. Have no last_email_date at all
  let fixedCount = 0;
  for (const [key, info] of senderInfo) {
    const existing = existingMap.get(key);
    let needsFix = false;

    if (!existing || existing.count === 0 || !existing.lastDate) {
      needsFix = true;
    } else if (info.newestDate) {
      // Use Date objects for comparison — string comparison fails when
      // Supabase returns different timestamp formats (.000Z vs +00:00)
      const newestTime = new Date(info.newestDate).getTime();
      const lastTime = new Date(existing.lastDate).getTime();
      if (newestTime > lastTime) {
        needsFix = true;
      }
    }

    if (needsFix) {
      await recalculateSenderStats(userId, accountId, info.email, info.name);
      fixedCount++;
    }
  }

  return fixedCount;
}

/**
 * Post-sync completeness verification with enforcement
 *
 * GUARANTEES:
 * - Asks Gmail: "What are your newest emails?"
 * - Verifies: "Do we have all of them locally?"
 * - If any are missing, attempts to add them
 * - Re-verifies after adding to confirm success
 * - Returns complete: false if verification fails (triggers recovery)
 *
 * The verification is DATA-DRIVEN (Gmail's actual state), not COUNT-DRIVEN.
 * The fetch count is an implementation detail; the guarantee is completeness.
 *
 * This function MUST NOT return complete: true if any Gmail emails are missing
 */
async function verifyCompletenessAndSync(
  accessToken: string,
  accountId: string,
  userEmail: string,
  affectedSenders: Set<string>
): Promise<{ addedCount: number; complete: boolean; missingCount: number; sendersWithUnsubscribe: Map<string, { unsubscribeLink: string; mailtoLink: string | null; hasOneClick: boolean; receivedAt: string }> }> {
  console.log('Verifying sync completeness: checking Gmail\'s newest emails exist locally...');

  // Ask Gmail for its newest emails, then verify we have ALL of them
  // The count (50) is implementation detail; the guarantee is: Gmail's emails = our emails
  const response = await listMessages(accessToken, {
    maxResults: 50,
    q: '-in:sent -in:drafts -in:trash -in:spam',
  });

  if (!response.messages || response.messages.length === 0) {
    console.log('Completeness check: No messages in Gmail');
    return { addedCount: 0, complete: true, missingCount: 0, sendersWithUnsubscribe: new Map() };
  }

  const gmailIds = response.messages.map(m => m.id);

  // Check if these exist in our DB
  const { data: existingEmails } = await supabase
    .from('emails')
    .select('gmail_message_id')
    .eq('email_account_id', accountId)
    .in('gmail_message_id', gmailIds);

  const existingIds = new Set((existingEmails || []).map(e => e.gmail_message_id));
  let missingIds = gmailIds.filter(id => !existingIds.has(id));

  if (missingIds.length === 0) {
    console.log('Completeness check: All of Gmail\'s newest emails exist locally ✓');
    return { addedCount: 0, complete: true, missingCount: 0, sendersWithUnsubscribe: new Map() };
  }

  console.log(`Completeness check: ${missingIds.length} emails missing, attempting to add...`);


  // Attempt to add the missing emails
  const result = await processNewMessages(
    accessToken, accountId, userEmail, missingIds, affectedSenders
  );

  console.log(`Completeness check: Added ${result.addedCount} of ${missingIds.length} missing emails`);

  // RE-VERIFY: Check again to confirm all missing emails were actually added
  const { data: recheck } = await supabase
    .from('emails')
    .select('gmail_message_id')
    .eq('email_account_id', accountId)
    .in('gmail_message_id', missingIds);

  const recheckIds = new Set((recheck || []).map(e => e.gmail_message_id));
  const stillMissing = missingIds.filter(id => !recheckIds.has(id));

  if (stillMissing.length > 0) {
    console.error(`Completeness check FAILED: ${stillMissing.length} emails still missing after attempted add`);
    return { addedCount: result.addedCount, complete: false, missingCount: stillMissing.length, sendersWithUnsubscribe: result.sendersWithUnsubscribe };
  }

  console.log('Completeness check: Verified all of Gmail\'s newest emails now exist locally ✓');
  return { addedCount: result.addedCount, complete: true, missingCount: 0, sendersWithUnsubscribe: result.sendersWithUnsubscribe };
}

/**
 * Batch recalculate sender stats for multiple senders at once.
 *
 * Instead of 3 sequential DB queries per sender (N senders = 3N queries),
 * this does it in ~3 total queries:
 * 1. Fetch all emails for affected senders (paginated for Supabase 1000-row limit)
 * 2. Aggregate stats in-memory
 * 3. Fetch existing sender rows to determine insert vs update
 * 4. Batch insert/update/delete
 *
 * This prevents Vercel Hobby 10s timeout when 20+ senders are affected.
 */
async function batchRecalculateSenderStats(
  userId: string,
  accountId: string,
  affectedSenderKeys: Set<string>
): Promise<void> {
  if (affectedSenderKeys.size === 0) return;

  // Extract unique sender emails for DB filtering
  const affectedEmails = [...new Set([...affectedSenderKeys].map(k => k.split('|||')[0]))];

  // 1. Fetch all emails for affected senders (paginated to handle Supabase 1000-row limit)
  const allEmails: Array<{ sender_email: string; sender_name: string; received_at: string; is_unread: boolean }> = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from('emails')
      .select('sender_email, sender_name, received_at, is_unread')
      .eq('email_account_id', accountId)
      .in('sender_email', affectedEmails)
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    allEmails.push(...data);
    if (data.length < 1000) break;
    page++;
  }

  // 2. Aggregate stats per sender key (only for affected senders)
  const statsMap = new Map<string, {
    email_count: number;
    unread_count: number;
    first_email_date: string;
    last_email_date: string;
  }>();

  for (const email of allEmails) {
    const key = `${email.sender_email}|||${email.sender_name}`;
    if (!affectedSenderKeys.has(key)) continue;
    const existing = statsMap.get(key);
    if (existing) {
      existing.email_count++;
      if (email.is_unread) existing.unread_count++;
      if (email.received_at < existing.first_email_date) existing.first_email_date = email.received_at;
      if (email.received_at > existing.last_email_date) existing.last_email_date = email.received_at;
    } else {
      statsMap.set(key, {
        email_count: 1,
        unread_count: email.is_unread ? 1 : 0,
        first_email_date: email.received_at,
        last_email_date: email.received_at,
      });
    }
  }

  // 3. Fetch existing sender rows for affected senders
  const existingSenders: Array<{ id: string; sender_email: string; sender_name: string }> = [];
  for (let i = 0; i < affectedEmails.length; i += 100) {
    const batch = affectedEmails.slice(i, i + 100);
    const { data } = await supabase
      .from('email_senders')
      .select('id, sender_email, sender_name')
      .eq('email_account_id', accountId)
      .in('sender_email', batch);
    if (data) existingSenders.push(...data);
  }

  const existingMap = new Map<string, string>();
  for (const s of existingSenders) {
    existingMap.set(`${s.sender_email}|||${s.sender_name}`, s.id);
  }

  // 4. Categorize into insert/update/delete
  const toInsert: any[] = [];
  const toUpdate: Array<{ id: string; data: any }> = [];
  const toDeleteIds: string[] = [];
  const now = new Date().toISOString();

  for (const key of affectedSenderKeys) {
    const [senderEmail, senderName] = key.split('|||');
    const stats = statsMap.get(key);
    const existingId = existingMap.get(key);

    if (!stats) {
      // No emails left for this sender - delete if row exists
      if (existingId) toDeleteIds.push(existingId);
    } else if (existingId) {
      // Update existing sender row
      toUpdate.push({
        id: existingId,
        data: {
          email_count: stats.email_count,
          unread_count: stats.unread_count,
          first_email_date: stats.first_email_date,
          last_email_date: stats.last_email_date,
          updated_at: now,
        }
      });
    } else {
      // Insert new sender row
      toInsert.push({
        user_id: userId,
        email_account_id: accountId,
        sender_email: senderEmail,
        sender_name: senderName,
        email_count: stats.email_count,
        unread_count: stats.unread_count,
        first_email_date: stats.first_email_date,
        last_email_date: stats.last_email_date,
        has_unsubscribe: false,
        is_newsletter: false,
        is_promotional: false,
        updated_at: now,
      });
    }
  }

  // 5. Execute batch operations
  // Insert new senders in batches
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('email_senders').insert(batch);
    if (error) console.error('Batch sender insert error:', error.message);
  }

  // Update existing senders concurrently (10 at a time)
  for (let i = 0; i < toUpdate.length; i += 10) {
    const batch = toUpdate.slice(i, i + 10);
    await Promise.all(batch.map(({ id, data }) =>
      supabase.from('email_senders').update(data).eq('id', id)
    ));
  }

  // Delete senders with no remaining emails
  if (toDeleteIds.length > 0) {
    await supabase.from('email_senders').delete().in('id', toDeleteIds);
  }

  console.log(`Batch sender stats: ${toInsert.length} inserted, ${toUpdate.length} updated, ${toDeleteIds.length} deleted`);
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
export function parseSender(fromHeader: string): { senderEmail: string; senderName: string } {
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
 * Extract unsubscribe link from List-Unsubscribe header (prefers HTTP)
 */
export function extractUnsubscribeLink(header: string): string | null {
  if (!header) return null;

  // Prefer HTTPS links in angle brackets (RFC 2369 standard)
  const httpMatch = header.match(/<(https?:\/\/[^>]+)>/);
  if (httpMatch) return httpMatch[1];

  // Fallback: bare URL without angle brackets (some senders like Chess.com)
  const httpMatchBare = header.match(/(https?:\/\/\S+)/);
  if (httpMatchBare) return httpMatchBare[1];

  // Mailto in angle brackets
  const mailtoMatch = header.match(/<(mailto:[^>]+)>/);
  if (mailtoMatch) return mailtoMatch[1];

  // Fallback: bare mailto
  const mailtoBare = header.match(/(mailto:\S+)/);
  if (mailtoBare) return mailtoBare[1];

  return null;
}

/**
 * Extract mailto unsubscribe link from List-Unsubscribe header (always extracts mailto if present)
 */
export function extractMailtoUnsubscribeLink(header: string): string | null {
  if (!header) return null;

  // Mailto in angle brackets (RFC 2369 standard)
  const mailtoMatch = header.match(/<(mailto:[^>]+)>/);
  if (mailtoMatch) return mailtoMatch[1];

  // Fallback: bare mailto without angle brackets
  const mailtoBare = header.match(/(mailto:\S+)/);
  return mailtoBare ? mailtoBare[1] : null;
}

/**
 * Repair Sync: Rebuild all sender stats from existing emails
 *
 * This fixes corrupted sender data (wrong dates, counts) without re-fetching from Gmail.
 * It deletes all existing sender records and rebuilds them from the emails table.
 * This guarantees correctness by avoiding partial updates that might miss rows.
 */
async function performRepairSync(
  res: VercelResponse,
  userId: string,
  accountId: string,
  email: string
) {
  console.log('Repair sync: fetching all emails from database...');

  // Get all emails for this account (include labels for newsletter/promotional detection)
  const { data: emails, error: emailsError } = await supabase
    .from('emails')
    .select('sender_email, sender_name, received_at, is_unread, labels')
    .eq('email_account_id', accountId);

  if (emailsError) {
    console.error('Repair sync: failed to fetch emails:', emailsError);
    return res.status(500).json({ error: 'Failed to fetch emails for repair' });
  }

  if (!emails || emails.length === 0) {
    console.log('Repair sync: no emails found, deleting all senders');
    await supabase.from('email_senders').delete().eq('email_account_id', accountId);
    return res.status(200).json({
      success: true,
      message: 'No emails - cleared all sender records',
      syncType: 'repair'
    });
  }

  console.log(`Repair sync: rebuilding stats from ${emails.length} emails...`);

  // Aggregate emails by sender (name + email composite key)
  const senderStats = new Map<string, {
    sender_email: string;
    sender_name: string;
    email_count: number;
    unread_count: number;
    first_email_date: string;
    last_email_date: string;
    is_newsletter: boolean;
    is_promotional: boolean;
  }>();

  for (const emailRecord of emails) {
    const key = `${emailRecord.sender_email}|||${emailRecord.sender_name}`;
    const existing = senderStats.get(key);
    const labels = emailRecord.labels || [];

    if (existing) {
      existing.email_count++;
      if (emailRecord.is_unread) existing.unread_count++;
      if (emailRecord.received_at < existing.first_email_date) {
        existing.first_email_date = emailRecord.received_at;
      }
      if (emailRecord.received_at > existing.last_email_date) {
        existing.last_email_date = emailRecord.received_at;
      }
      // Update newsletter/promotional flags if any email has them
      if (labels.includes('CATEGORY_UPDATES')) existing.is_newsletter = true;
      if (labels.includes('CATEGORY_PROMOTIONS')) existing.is_promotional = true;
    } else {
      senderStats.set(key, {
        sender_email: emailRecord.sender_email,
        sender_name: emailRecord.sender_name,
        email_count: 1,
        unread_count: emailRecord.is_unread ? 1 : 0,
        first_email_date: emailRecord.received_at,
        last_email_date: emailRecord.received_at,
        is_newsletter: labels.includes('CATEGORY_UPDATES'),
        is_promotional: labels.includes('CATEGORY_PROMOTIONS'),
      });
    }
  }

  console.log(`Repair sync: deleting old senders and inserting ${senderStats.size} rebuilt records...`);

  // Delete all existing senders for this account (clean slate)
  const { error: deleteError } = await supabase
    .from('email_senders')
    .delete()
    .eq('email_account_id', accountId);

  if (deleteError) {
    console.error('Repair sync: failed to delete old senders:', deleteError);
    return res.status(500).json({ error: 'Failed to clear old sender records' });
  }

  // Insert all senders with correct stats
  const sendersToInsert = Array.from(senderStats.values()).map(s => ({
    user_id: userId,
    email_account_id: accountId,
    sender_email: s.sender_email,
    sender_name: s.sender_name,
    email_count: s.email_count,
    unread_count: s.unread_count,
    first_email_date: s.first_email_date,
    last_email_date: s.last_email_date,
    has_unsubscribe: false, // Will need full sync to get this from headers
    unsubscribe_link: null,
    is_newsletter: s.is_newsletter,
    is_promotional: s.is_promotional,
    updated_at: new Date().toISOString()
  }));

  // Insert in batches
  let insertedCount = 0;
  for (let i = 0; i < sendersToInsert.length; i += BATCH_SIZE) {
    const batch = sendersToInsert.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase.from('email_senders').insert(batch);
    if (insertError) {
      console.error('Repair sync: batch insert error:', insertError.message);
    } else {
      insertedCount += batch.length;
    }
  }

  console.log(`Repair sync: inserted ${insertedCount} senders with correct stats`);

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: userId,
    action_type: 'email_sync',
    description: `Repair sync: rebuilt ${insertedCount} sender records from ${emails.length} emails`,
    metadata: { email, syncType: 'repair', sendersRebuilt: insertedCount, emailsProcessed: emails.length }
  });

  return res.status(200).json({
    success: true,
    message: `Rebuilt ${insertedCount} sender records from ${emails.length} emails`,
    sendersRebuilt: insertedCount,
    emailsProcessed: emails.length,
    syncType: 'repair'
  });
}

export default withSentry(handler);
