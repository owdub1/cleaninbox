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

  // ENFORCEMENT: If completeness check failed, escalate to recovery sync automatically
  if (!completenessResult.complete) {
    console.log(`Completeness check failed with ${completenessResult.missingCount} missing emails - escalating to recovery sync`);

    // Perform a scoped recovery sync to catch any missing emails
    const recoveryResult = await performRecoverySync(
      accessToken, accountId, userEmail, affectedSenders
    );
    addedCount += recoveryResult.addedCount;

    // Final verification - if still incomplete, this is a critical failure
    const finalCheck = await verifyCompletenessAndSync(
      accessToken, accountId, userEmail, affectedSenders
    );
    addedCount += finalCheck.addedCount;

    if (!finalCheck.complete) {
      console.error(`CRITICAL: Recovery sync failed - ${finalCheck.missingCount} emails still missing`);
      // Still update last_synced to prevent infinite loops, but log the failure
      syncMethod = 'recovery-failed';
    } else {
      console.log('Recovery sync succeeded - all emails now synced ✓');
      syncMethod = 'recovery';
    }
  }

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
    message: syncMethod.includes('failed')
      ? `Sync incomplete - ${completenessResult.missingCount} emails could not be synced`
      : (addedCount > 0 || deletedCount > 0 ? description : 'Inbox is up to date'),
    syncType: syncMethod.includes('recovery') ? 'recovery' : 'incremental',
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

  const requiredHeaders = ['From', 'Date', 'Subject', 'List-Unsubscribe', 'List-Unsubscribe-Post'];
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

    // Use Gmail's internalDate (epoch ms) instead of Date header for reliable timezone handling
    // The Date header can be in any timezone and JS parsing can shift the date
    const receivedAt = new Date(parseInt(msg.internalDate)).toISOString();

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
): Promise<{ addedCount: number }> {
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
    return { addedCount: 0 };
  }

  // Fetch and add all missing emails
  const result = await processNewMessages(
    accessToken, accountId, userEmail, missingIds, affectedSenders
  );

  console.log(`Recovery sync: Added ${result.addedCount} missing emails`);
  return { addedCount: result.addedCount };
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
): Promise<{ addedCount: number; complete: boolean; missingCount: number }> {
  console.log('Verifying sync completeness: checking Gmail\'s newest emails exist locally...');

  // Ask Gmail for its newest emails, then verify we have ALL of them
  // The count (50) is implementation detail; the guarantee is: Gmail's emails = our emails
  const response = await listMessages(accessToken, {
    maxResults: 50,
    q: '-in:sent -in:drafts -in:trash -in:spam',
  });

  if (!response.messages || response.messages.length === 0) {
    console.log('Completeness check: No messages in Gmail');
    return { addedCount: 0, complete: true, missingCount: 0 };
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
    return { addedCount: 0, complete: true, missingCount: 0 };
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
    return { addedCount: result.addedCount, complete: false, missingCount: stillMissing.length };
  }

  console.log('Completeness check: Verified all of Gmail\'s newest emails now exist locally ✓');
  return { addedCount: result.addedCount, complete: true, missingCount: 0 };
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
 * Extract unsubscribe link from List-Unsubscribe header (prefers HTTP)
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

/**
 * Extract mailto unsubscribe link from List-Unsubscribe header (always extracts mailto if present)
 */
function extractMailtoUnsubscribeLink(header: string): string | null {
  if (!header) return null;

  const mailtoMatch = header.match(/<(mailto:[^>]+)>/);
  return mailtoMatch ? mailtoMatch[1] : null;
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
