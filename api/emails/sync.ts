/**
 * Email Sync Endpoint
 *
 * POST /api/emails/sync
 *
 * Fetches emails from Gmail and updates sender statistics.
 * Requires authenticated user with connected Gmail account.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit } from '../lib/rate-limiter.js';
import { getValidAccessToken } from '../lib/gmail.js';
import { fetchSenderStats, SenderStats, EmailRecord, SyncResult, getHistoryChanges, getDeletedMessageIds, getProfile, listAllMessageIds, listMessages, batchGetMessages, getMessage } from '../lib/gmail-api.js';
import { PLAN_LIMITS } from '../subscription/get.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// More relaxed rate limit for sync operations (allows syncing multiple accounts)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 syncs per minute (allows multiple accounts)
  message: 'Too many sync requests. Please wait before syncing again.'
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  if (limiter(req, res)) return;

  // Require authentication
  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  const { email, maxMessages = 1000, fullSync = false, checkDeleted = false } = req.body;

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
      .select('id, gmail_email, connection_status, last_synced, total_emails, history_id, full_orphan_check_done')
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

    // Check if enough time has passed since last sync (skip for unlimited plans)
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
          plan: planKey,
          upgradeMessage: planKey === 'free'
            ? 'Upgrade to Basic for syncing every 4 hours, or Pro for hourly syncing.'
            : planKey === 'basic'
            ? 'Upgrade to Pro for hourly syncing, or Unlimited for unlimited syncing.'
            : planKey === 'pro'
            ? 'Upgrade to Unlimited for unlimited syncing.'
            : undefined
        });
      }
    }

    // Try to get valid access token (refreshes if needed)
    // This will throw if no valid tokens exist
    let accessToken: string;
    try {
      const tokenResult = await getValidAccessToken(
        user.userId,
        account.gmail_email || email
      );
      accessToken = tokenResult.accessToken;

      // If we got here, tokens are valid - ensure connection_status is correct
      if (account.connection_status !== 'connected') {
        console.log('Auto-fixing connection_status for account:', email);
        await supabase
          .from('email_accounts')
          .update({ connection_status: 'connected', updated_at: new Date().toISOString() })
          .eq('id', account.id);
      }
    } catch (tokenError: any) {
      console.error('Token error for user', user.userId, 'email', account.gmail_email || email, ':', tokenError.message);

      // Check if tokens exist at all
      const { data: tokenCheck, error: checkError } = await supabase
        .from('gmail_oauth_tokens')
        .select('id, gmail_email, token_expiry')
        .eq('user_id', user.userId);

      console.log('Token check result:', { tokenCheck, checkError });

      // Update status to reflect the issue
      await supabase
        .from('email_accounts')
        .update({ connection_status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', account.id);

      return res.status(400).json({
        error: `Gmail connection error: ${tokenError.message}. Please reconnect your Gmail account.`,
        code: 'TOKEN_ERROR',
        debug: {
          gmailEmail: account.gmail_email || email,
          tokensFound: tokenCheck?.length || 0
        }
      });
    }

    // Determine sync mode:
    // - First sync (no last_synced): Full sync to get all historical emails
    // - Stale sync (>30 days): Full sync to refresh data
    // - Subsequent syncs: Quick sync fetching most recent emails (no date filter to catch stragglers)
    const isFirstSync = !account.last_synced;

    // Check if last sync was more than 30 days ago
    const STALE_SYNC_DAYS = 30;
    const isStaleSync = account.last_synced &&
      (Date.now() - new Date(account.last_synced).getTime()) > (STALE_SYNC_DAYS * 24 * 60 * 60 * 1000);

    const isFullSync = isFirstSync || isStaleSync || fullSync;
    const isIncrementalSync = !isFullSync;

    // Filter out user's own email address
    const userEmail = (account.gmail_email || email).toLowerCase();

    // ========== FAST SYNC PATH ==========
    // Use History API for instant incremental syncs when possible
    if (isIncrementalSync && account.history_id) {
      console.log('Fast sync: Using History API to detect changes...');
      const { addedMessageIds, deletedMessageIds, newHistoryId, historyExpired } =
        await getHistoryChanges(accessToken, account.history_id);

      if (historyExpired) {
        console.log('History expired, falling back to standard sync');
        // Fall through to standard sync below
      } else if (addedMessageIds.length === 0 && deletedMessageIds.length === 0) {
        // History API says no changes - but verify by checking recent Gmail emails
        // This catches emails that History API may have missed
        console.log('Fast sync: No history changes, verifying recent emails...');

        const recentGmail = await listMessages(accessToken, {
          maxResults: 50,
          q: '-in:sent -in:drafts -in:trash -in:spam'
        });

        const recentGmailIds = (recentGmail.messages || []).map((m: any) => m.id);

        if (recentGmailIds.length > 0) {
          // Check which of these we already have
          const { data: existingEmails } = await supabase
            .from('emails')
            .select('gmail_message_id')
            .eq('email_account_id', account.id)
            .in('gmail_message_id', recentGmailIds);

          const existingIds = new Set((existingEmails || []).map(e => e.gmail_message_id));
          const missingIds = recentGmailIds.filter((id: string) => !existingIds.has(id));

          if (missingIds.length > 0) {
            console.log(`Found ${missingIds.length} emails missing from DB, adding them...`);

            // Fetch and add missing emails
            const messages = await batchGetMessages(
              accessToken,
              missingIds,
              'metadata',
              ['From', 'Date', 'Subject', 'List-Unsubscribe']
            );

            let addedCount = 0;
            const affectedSenders = new Set<string>();

            for (const msg of messages) {
              const labels = msg.labelIds || [];
              if (labels.includes('SPAM') || labels.includes('TRASH')) continue;

              const fromHeader = msg.payload?.headers?.find((h: any) => h.name === 'From')?.value || '';
              const dateHeader = msg.payload?.headers?.find((h: any) => h.name === 'Date')?.value || '';
              const subjectHeader = msg.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '';

              const emailMatch = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s<]+@[^\s>]+)/);
              const senderEmail = emailMatch ? emailMatch[1].toLowerCase() : fromHeader.toLowerCase();
              const nameMatch = fromHeader.match(/^"?([^"<]+)"?\s*</) || fromHeader.match(/^([^<@]+)(?=@)/);
              const senderName = nameMatch ? nameMatch[1].trim() : senderEmail;

              if (senderEmail === userEmail) continue;

              const { error } = await supabase.from('emails').insert({
                gmail_message_id: msg.id,
                email_account_id: account.id,
                sender_email: senderEmail,
                sender_name: senderName,
                subject: subjectHeader || '(No Subject)',
                snippet: msg.snippet || '',
                received_at: dateHeader ? new Date(dateHeader).toISOString() : new Date(parseInt(msg.internalDate)).toISOString(),
                is_unread: labels.includes('UNREAD'),
                thread_id: msg.threadId,
                labels,
              });

              if (!error) {
                addedCount++;
                affectedSenders.add(`${senderEmail}|||${senderName}`);
              }
            }

            // Update sender stats for affected senders
            for (const key of affectedSenders) {
              const [senderEmail, senderName] = key.split('|||');

              const { data: emailStats } = await supabase
                .from('emails')
                .select('received_at')
                .eq('email_account_id', account.id)
                .eq('sender_email', senderEmail)
                .eq('sender_name', senderName)
                .order('received_at', { ascending: false });

              const { data: existingSender } = await supabase
                .from('email_senders')
                .select('id')
                .eq('email_account_id', account.id)
                .eq('sender_email', senderEmail)
                .eq('sender_name', senderName)
                .single();

              if (existingSender) {
                await supabase.from('email_senders')
                  .update({
                    email_count: emailStats?.length || 0,
                    last_email_date: emailStats?.[0]?.received_at || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingSender.id);
              } else {
                await supabase.from('email_senders').insert({
                  user_id: user.userId,
                  email_account_id: account.id,
                  sender_email: senderEmail,
                  sender_name: senderName,
                  email_count: emailStats?.length || 1,
                  unread_count: 0,
                  first_email_date: emailStats?.[emailStats.length - 1]?.received_at || new Date().toISOString(),
                  last_email_date: emailStats?.[0]?.received_at || new Date().toISOString(),
                });
              }
            }

            await supabase
              .from('email_accounts')
              .update({
                last_synced: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                history_id: newHistoryId
              })
              .eq('id', account.id);

            await supabase.from('activity_log').insert({
              user_id: user.userId,
              action_type: 'email_sync',
              description: `Fast sync: Added ${addedCount} missed emails`,
              metadata: { email, syncType: 'fast', addedEmails: addedCount }
            });

            return res.status(200).json({
              success: true,
              totalSenders: affectedSenders.size,
              addedEmails: addedCount,
              totalEmails: account.total_emails || 0,
              deletedEmails: 0,
              message: `Added ${addedCount} emails`,
              syncType: 'fast'
            });
          }
        }

        // Truly no new emails - but validate and fix any stale sender dates
        console.log('Fast sync: Verified, no new emails. Checking for stale sender dates...');

        // Get all senders and validate their last_email_date matches actual emails
        const { data: allSenders } = await supabase
          .from('email_senders')
          .select('id, sender_email, sender_name, last_email_date, email_count')
          .eq('email_account_id', account.id);

        let fixedCount = 0;
        for (const sender of allSenders || []) {
          // Get actual latest email date from emails table
          const { data: actualLatest } = await supabase
            .from('emails')
            .select('received_at')
            .eq('email_account_id', account.id)
            .eq('sender_email', sender.sender_email)
            .eq('sender_name', sender.sender_name)
            .order('received_at', { ascending: false })
            .limit(1);

          if (actualLatest && actualLatest.length > 0) {
            const actualDate = actualLatest[0].received_at;
            // If the stored date doesn't match actual, fix it
            if (sender.last_email_date !== actualDate) {
              // Also get correct count
              const { count: actualCount } = await supabase
                .from('emails')
                .select('*', { count: 'exact', head: true })
                .eq('email_account_id', account.id)
                .eq('sender_email', sender.sender_email)
                .eq('sender_name', sender.sender_name);

              await supabase
                .from('email_senders')
                .update({
                  last_email_date: actualDate,
                  email_count: actualCount || 0,
                  updated_at: new Date().toISOString()
                })
                .eq('id', sender.id);
              fixedCount++;
            }
          } else if (sender.email_count > 0) {
            // No emails exist but sender has count > 0 - delete the sender
            await supabase.from('email_senders').delete().eq('id', sender.id);
            fixedCount++;
          }
        }

        if (fixedCount > 0) {
          console.log(`Fixed ${fixedCount} stale sender records`);
        }

        await supabase
          .from('email_accounts')
          .update({
            last_synced: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            history_id: newHistoryId
          })
          .eq('id', account.id);

        await supabase.from('activity_log').insert({
          user_id: user.userId,
          action_type: 'email_sync',
          description: fixedCount > 0 ? `Fast sync: Fixed ${fixedCount} stale senders` : 'Fast sync: No changes',
          metadata: { email, syncType: 'fast', changes: 0, fixedSenders: fixedCount }
        });

        return res.status(200).json({
          success: true,
          totalSenders: 0,
          updatedSenders: fixedCount,
          totalEmails: account.total_emails || 0,
          deletedEmails: 0,
          message: fixedCount > 0 ? `Fixed ${fixedCount} stale senders` : 'No new changes',
          syncType: 'fast'
        });
      } else {
        // Process only the changes
        console.log(`Fast sync: ${addedMessageIds.length} new, ${deletedMessageIds.length} deleted`);

        let addedCount = 0;
        let deletedCount = 0;
        const affectedSenderEmails = new Set<string>();

        // Handle deletions first
        if (deletedMessageIds.length > 0) {
          // Get emails that match deleted IDs
          const { data: deletedEmails } = await supabase
            .from('emails')
            .select('id, sender_email, sender_name')
            .eq('email_account_id', account.id)
            .in('gmail_message_id', deletedMessageIds);

          if (deletedEmails && deletedEmails.length > 0) {
            // Delete from emails table
            await supabase.from('emails').delete()
              .in('id', deletedEmails.map(e => e.id));
            deletedCount = deletedEmails.length;

            // Track affected senders
            for (const email of deletedEmails) {
              affectedSenderEmails.add(email.sender_email);
            }
          }
        }

        // Handle new messages
        if (addedMessageIds.length > 0) {
          // Filter out messages we already have
          const { data: existingEmails } = await supabase
            .from('emails')
            .select('gmail_message_id')
            .eq('email_account_id', account.id)
            .in('gmail_message_id', addedMessageIds);

          const existingIds = new Set((existingEmails || []).map(e => e.gmail_message_id));
          const newMessageIds = addedMessageIds.filter(id => !existingIds.has(id));

          if (newMessageIds.length > 0) {
            console.log(`Fetching ${newMessageIds.length} new message details...`);
            // Fetch message details for new emails
            const messages = await batchGetMessages(
              accessToken,
              newMessageIds,
              'metadata',
              ['From', 'Date', 'Subject', 'List-Unsubscribe']
            );

            // Process and insert new emails
            for (const msg of messages) {
              const fromHeader = msg.payload?.headers?.find((h: any) => h.name === 'From')?.value || '';
              const dateHeader = msg.payload?.headers?.find((h: any) => h.name === 'Date')?.value || '';
              const subjectHeader = msg.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '';

              // Parse sender
              const emailMatch = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s<]+@[^\s>]+)/);
              const senderEmail = emailMatch ? emailMatch[1].toLowerCase() : fromHeader.toLowerCase();
              const nameMatch = fromHeader.match(/^"?([^"<]+)"?\s*</) || fromHeader.match(/^([^<@]+)(?=@)/);
              const senderName = nameMatch ? nameMatch[1].trim() : senderEmail;

              // Skip user's own emails
              if (senderEmail === userEmail) continue;

              // Insert email
              const { error } = await supabase.from('emails').insert({
                gmail_message_id: msg.id,
                email_account_id: account.id,
                sender_email: senderEmail,
                sender_name: senderName,
                subject: subjectHeader || '(No Subject)',
                snippet: msg.snippet || '',
                received_at: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
                is_unread: msg.labelIds?.includes('UNREAD') || false,
                thread_id: msg.threadId,
                labels: msg.labelIds || [],
              });

              if (!error) {
                addedCount++;
                affectedSenderEmails.add(senderEmail);

                // Ensure sender exists
                const { data: existingSender } = await supabase
                  .from('email_senders')
                  .select('id')
                  .eq('email_account_id', account.id)
                  .eq('sender_email', senderEmail)
                  .eq('sender_name', senderName)
                  .single();

                if (!existingSender) {
                  await supabase.from('email_senders').insert({
                    user_id: user.userId,
                    email_account_id: account.id,
                    sender_email: senderEmail,
                    sender_name: senderName,
                    email_count: 0, // Will be updated below
                    unread_count: 0,
                    first_email_date: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
                    last_email_date: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
                  });
                }
              }
            }
          }
        }

        // Update counts and dates for affected senders only
        if (affectedSenderEmails.size > 0) {
          console.log(`Updating ${affectedSenderEmails.size} affected senders...`);
          for (const senderEmail of affectedSenderEmails) {
            const { data: senderRecords } = await supabase
              .from('email_senders')
              .select('id, sender_name')
              .eq('email_account_id', account.id)
              .eq('sender_email', senderEmail);

            for (const sender of senderRecords || []) {
              const { data: emailStats } = await supabase
                .from('emails')
                .select('received_at')
                .eq('email_account_id', account.id)
                .eq('sender_email', senderEmail)
                .eq('sender_name', sender.sender_name)
                .order('received_at', { ascending: false });

              if (emailStats && emailStats.length > 0) {
                await supabase
                  .from('email_senders')
                  .update({
                    email_count: emailStats.length,
                    last_email_date: emailStats[0].received_at,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', sender.id);
              } else {
                // No emails left, delete sender
                await supabase.from('email_senders').delete().eq('id', sender.id);
              }
            }
          }
        }

        // Update account
        await supabase
          .from('email_accounts')
          .update({
            last_synced: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            history_id: newHistoryId
          })
          .eq('id', account.id);

        await supabase.from('activity_log').insert({
          user_id: user.userId,
          action_type: 'email_sync',
          description: `Fast sync: ${addedCount} added, ${deletedCount} deleted`,
          metadata: { email, syncType: 'fast', addedEmails: addedCount, deletedEmails: deletedCount }
        });

        return res.status(200).json({
          success: true,
          totalSenders: affectedSenderEmails.size,
          addedEmails: addedCount,
          deletedEmails: deletedCount,
          message: 'Fast sync completed',
          syncType: 'fast'
        });
      }
    }

    // ========== STANDARD SYNC PATH ==========
    // Used for first sync, stale sync, or when history is expired

    if (isStaleSync) {
      console.log(`Last sync was over ${STALE_SYNC_DAYS} days ago - forcing full sync to refresh`);
    }

    // Fetch sender statistics from Gmail
    const emailLimit = planLimits.emailProcessingLimit;
    // Full sync (first time or recovery): fetch up to plan limit for accurate counts
    // Quick sync: fetch recent 200 emails to catch any new/missed emails
    const messagesToFetch = isFullSync
      ? Math.min(10000, emailLimit)  // Full sync: up to 10k or plan limit
      : 200;  // Quick sync: fetch 200 most recent emails (no date filter)

    const syncType = isFirstSync ? 'FIRST' : isStaleSync ? 'STALE' : isIncrementalSync ? 'Quick' : 'FULL';
    console.log(`${syncType} sync starting... (plan: ${planKey}, fetching: ${messagesToFetch})`);
    const syncResult: SyncResult = await fetchSenderStats(
      accessToken,
      messagesToFetch,
      undefined  // no date filter, always fetch most recent
    );

    // Filter out user's own email address (sent/replied emails show up with user as sender)
    const senderStats = syncResult.senders.filter((sender: SenderStats) =>
      sender.email.toLowerCase() !== userEmail
    );
    const emailRecords = syncResult.emails.filter((email: EmailRecord) =>
      email.sender_email.toLowerCase() !== userEmail
    );
    console.log('Fetched senders:', senderStats.length, '(filtered from', syncResult.senders.length, ') Total emails:', senderStats.reduce((sum, s) => sum + s.count, 0));

    // Safety check: Don't delete existing data if full sync returned nothing
    // This prevents data loss when Gmail API returns 0 messages due to auth issues, API errors, or empty response
    if (isFullSync && senderStats.length === 0) {
      console.warn('Full sync returned 0 senders - keeping existing data to prevent data loss');
      return res.status(200).json({
        success: true,
        totalSenders: 0,
        totalEmails: account.total_emails || 0,
        message: 'No emails found - existing data preserved',
        warning: 'Gmail returned no emails. Check if account has proper permissions.'
      });
    }

    // For quick sync: update dates and add new senders, but don't modify counts (to avoid double-counting)
    // For full sync: replace all data with accurate counts
    let sendersToUpsert;
    let sendersToUpdate: any[] = []; // Existing senders that just need date updates

    // Helper to create composite key for sender lookup
    const getSenderKey = (email: string, name: string) => `${email}|||${name}`;

    if (isIncrementalSync && senderStats.length > 0) {
      // Get existing sender data to merge with (now keyed by email + name)
      const { data: existingSenders } = await supabase
        .from('email_senders')
        .select('id, sender_email, sender_name, email_count, unread_count, first_email_date, last_email_date')
        .eq('email_account_id', account.id);

      const existingMap = new Map(
        (existingSenders || []).map(s => [getSenderKey(s.sender_email, s.sender_name || s.sender_email), s])
      );

      // Separate new senders from existing ones
      const newSenders: typeof senderStats = [];

      for (const sender of senderStats) {
        const existing = existingMap.get(getSenderKey(sender.email, sender.name));
        if (existing) {
          // Existing sender - only update last_email_date if newer
          if (sender.lastDate > existing.last_email_date) {
            sendersToUpdate.push({
              id: existing.id,
              last_email_date: sender.lastDate,
              // Update unsubscribe info if we found it
              ...(sender.unsubscribeLink && { unsubscribe_link: sender.unsubscribeLink, has_unsubscribe: true }),
              updated_at: new Date().toISOString()
            });
          }
        } else {
          // New sender - add it
          newSenders.push(sender);
        }
      }

      // Only insert new senders
      sendersToUpsert = newSenders.map((sender: SenderStats) => ({
        user_id: user.userId,
        email_account_id: account.id,
        sender_email: sender.email,
        sender_name: sender.name,
        email_count: sender.count,
        unread_count: sender.unreadCount,
        first_email_date: sender.firstDate,
        last_email_date: sender.lastDate,
        unsubscribe_link: sender.unsubscribeLink || null,
        has_unsubscribe: sender.hasUnsubscribe,
        is_newsletter: sender.isNewsletter,
        is_promotional: sender.isPromotional,
        updated_at: new Date().toISOString()
      }));

      console.log(`Quick sync: ${newSenders.length} new senders, ${sendersToUpdate.length} existing senders to update`);
    } else {
      // Full sync - replace all data
      sendersToUpsert = senderStats.map((sender: SenderStats) => ({
        user_id: user.userId,
        email_account_id: account.id,
        sender_email: sender.email,
        sender_name: sender.name,
        email_count: sender.count,
        unread_count: sender.unreadCount,
        first_email_date: sender.firstDate,
        last_email_date: sender.lastDate,
        unsubscribe_link: sender.unsubscribeLink || null,
        has_unsubscribe: sender.hasUnsubscribe,
        is_newsletter: sender.isNewsletter,
        is_promotional: sender.isPromotional,
        updated_at: new Date().toISOString()
      }));
    }

    // Remove user's own email from senders table if it exists (from previous syncs)
    const { error: deleteOwnError } = await supabase
      .from('email_senders')
      .delete()
      .eq('email_account_id', account.id)
      .eq('sender_email', userEmail);
    if (deleteOwnError) {
      console.warn('Could not delete own email from senders:', deleteOwnError);
    }

    // Upsert senders in batches (now using composite key: email_account_id, sender_email, sender_name)
    const BATCH_SIZE = 100;

    // For full sync, delete existing senders first to avoid constraint issues
    if (isFullSync) {
      console.log('Inserting', sendersToUpsert.length, 'senders to database (full sync)...');
      const { error: deleteSendersError } = await supabase
        .from('email_senders')
        .delete()
        .eq('email_account_id', account.id);
      if (deleteSendersError) {
        console.warn('Failed to clear old senders:', deleteSendersError);
      } else {
        console.log('Cleared existing senders for full sync');
      }
    } else {
      console.log('Quick sync: inserting', sendersToUpsert.length, 'new senders, updating', sendersToUpdate.length, 'existing...');
    }

    // For quick sync, update existing senders' dates (no delete/re-insert needed)
    if (isIncrementalSync && sendersToUpdate.length > 0) {
      let updatedCount = 0;
      for (const update of sendersToUpdate) {
        const { id, ...updateData } = update;
        const { error: updateError } = await supabase
          .from('email_senders')
          .update(updateData)
          .eq('id', id);
        if (updateError) {
          console.warn('Failed to update sender date:', updateError);
        } else {
          updatedCount++;
        }
      }
      console.log(`Updated ${updatedCount} existing senders with new dates`);
    }

    // Insert new senders in batches
    let insertedSenders = 0;
    let failedSenders = 0;
    let lastInsertError: any = null;
    for (let i = 0; i < sendersToUpsert.length; i += BATCH_SIZE) {
      const batch = sendersToUpsert.slice(i, i + BATCH_SIZE);
      const { error: senderError, data: insertedData } = await supabase.from('email_senders').insert(batch).select('id');
      if (senderError) {
        console.error('Sender insert error:', senderError);
        if (batch.length > 0) {
          console.error('First item in failed batch:', JSON.stringify(batch[0], null, 2));
        }
        failedSenders += batch.length;
        lastInsertError = senderError;
      } else {
        insertedSenders += insertedData?.length || batch.length;
      }
    }
    console.log(`Sender insert complete: ${insertedSenders} inserted, ${failedSenders} failed`);

    // Store individual emails in the emails table
    if (emailRecords.length > 0) {
      console.log('Storing', emailRecords.length, 'individual emails...');

      // For full sync, delete existing emails first to ensure clean state
      if (isFullSync) {
        const { error: deleteError } = await supabase
          .from('emails')
          .delete()
          .eq('email_account_id', account.id);
        if (deleteError) {
          console.warn('Failed to clear old emails:', deleteError);
        }
      }

      // Prepare email records with account ID
      const emailsToUpsert = emailRecords.map((email: EmailRecord) => ({
        gmail_message_id: email.gmail_message_id,
        email_account_id: account.id,
        sender_email: email.sender_email,
        sender_name: email.sender_name,
        subject: email.subject,
        snippet: email.snippet,
        received_at: email.received_at,
        is_unread: email.is_unread,
        thread_id: email.thread_id,
        labels: email.labels,
      }));

      // Insert emails in batches
      // For full sync: we deleted existing ones above
      // For incremental sync: duplicates are expected and will be rejected by unique constraint
      let insertedCount = 0;
      let duplicateCount = 0;
      for (let i = 0; i < emailsToUpsert.length; i += BATCH_SIZE) {
        const batch = emailsToUpsert.slice(i, i + BATCH_SIZE);
        const { error: emailInsertError, data } = await supabase
          .from('emails')
          .insert(batch)
          .select('gmail_message_id');

        if (emailInsertError) {
          // For incremental sync, duplicate key errors are expected - ignore them
          if (isIncrementalSync && emailInsertError.code === '23505') {
            // Unique violation - this is expected for incremental sync
            // Insert emails one by one to handle partial duplicates
            for (const email of batch) {
              const { error: singleError } = await supabase
                .from('emails')
                .insert(email);
              if (singleError) {
                if (singleError.code === '23505') {
                  duplicateCount++;
                } else {
                  console.error('Single email insert error:', singleError);
                }
              } else {
                insertedCount++;
              }
            }
          } else {
            console.error('Email insert error:', emailInsertError);
            if (batch.length > 0) {
              console.error('First item in failed batch:', JSON.stringify(batch[0], null, 2));
            }
          }
        } else {
          insertedCount += batch.length;
        }
      }
      if (isIncrementalSync) {
        console.log(`Email storage complete: ${insertedCount} new, ${duplicateCount} duplicates skipped`);

        // Always update sender dates AND counts from actual email data during incremental sync
        // This ensures senders show correct date groups and email counts
        console.log('Updating sender dates and counts from fetched emails...');
        const senderEmails = [...new Set(emailRecords.map(e => e.sender_email))];
        for (const senderEmail of senderEmails) {
          // Get all sender records for this email address
          const { data: senderRecords } = await supabase
            .from('email_senders')
            .select('id, sender_name')
            .eq('email_account_id', account.id)
            .eq('sender_email', senderEmail);

          for (const sender of senderRecords || []) {
            // Count actual emails and get latest date for this specific sender (email + name)
            const { data: emailStats } = await supabase
              .from('emails')
              .select('received_at')
              .eq('email_account_id', account.id)
              .eq('sender_email', senderEmail)
              .eq('sender_name', sender.sender_name)
              .order('received_at', { ascending: false });

            if (emailStats && emailStats.length > 0) {
              const actualCount = emailStats.length;
              const latestDate = emailStats[0].received_at;

              // Update sender with correct count and date
              const { error: updateError } = await supabase
                .from('email_senders')
                .update({
                  email_count: actualCount,
                  last_email_date: latestDate,
                  updated_at: new Date().toISOString()
                })
                .eq('id', sender.id);

              if (updateError) {
                console.warn(`Failed to update sender ${senderEmail}:`, updateError);
              }
            }
          }
        }
        console.log(`Updated dates and counts for ${senderEmails.length} sender emails`);
      } else {
        console.log('Email storage complete');
      }
    }

    // Detect and remove deleted emails using Gmail History API (fast!)
    // This runs on every quick sync if we have a history_id stored
    let orphanedCount = 0;
    let newHistoryId: string | undefined;

    if (isIncrementalSync) {
      if (account.history_id) {
        // Fast path: Use History API (only shows changes since last sync)
        console.log('Checking for deleted emails via History API...');
        const { deletedIds, newHistoryId: historyId } = await getDeletedMessageIds(accessToken, account.history_id);
        newHistoryId = historyId;

        if (deletedIds.length > 0) {
          console.log(`History API found ${deletedIds.length} deleted messages`);

          // Get the emails we have that match these deleted IDs
          const { data: deletedEmails } = await supabase
            .from('emails')
            .select('id, gmail_message_id, sender_email, sender_name')
            .eq('email_account_id', account.id)
            .in('gmail_message_id', deletedIds);

          if (deletedEmails && deletedEmails.length > 0) {
            // Delete the emails from our database
            const dbIds = deletedEmails.map(e => e.id);
            await supabase.from('emails').delete().in('id', dbIds);

            // Group by sender to update counts
            const senderCounts = new Map<string, number>();
            for (const email of deletedEmails) {
              const key = `${email.sender_email}|||${email.sender_name}`;
              senderCounts.set(key, (senderCounts.get(key) || 0) + 1);
            }

            // Decrement each sender's email_count and update last_email_date
            for (const [key, count] of senderCounts) {
              const [senderEmail, senderName] = key.split('|||');
              await supabase.rpc('decrement_sender_count', {
                p_account_id: account.id,
                p_sender_email: senderEmail,
                p_sender_name: senderName,
                p_count: count
              });

              // Recalculate last_email_date from remaining emails
              const { data: remainingEmails } = await supabase
                .from('emails')
                .select('received_at')
                .eq('email_account_id', account.id)
                .eq('sender_email', senderEmail)
                .eq('sender_name', senderName)
                .order('received_at', { ascending: false })
                .limit(1);

              if (remainingEmails && remainingEmails.length > 0) {
                await supabase
                  .from('email_senders')
                  .update({ last_email_date: remainingEmails[0].received_at, updated_at: new Date().toISOString() })
                  .eq('email_account_id', account.id)
                  .eq('sender_email', senderEmail)
                  .eq('sender_name', senderName);
              }
            }

            orphanedCount = deletedEmails.length;
            console.log(`Removed ${deletedEmails.length} deleted emails from ${senderCounts.size} senders`);
          }
        } else {
          console.log('No deleted emails detected via History API');
          // If full orphan check was never done, run it now to catch old deletions
          if (!account.full_orphan_check_done) {
            console.log('Running one-time full orphan check (history_id exists but orphan check never done)...');
            const gmailIds = await listAllMessageIds(accessToken);
            const gmailIdSet = new Set(gmailIds);
            console.log(`Fetched ${gmailIds.length} message IDs from Gmail for comparison`);

            const { data: dbEmails } = await supabase
              .from('emails')
              .select('id, gmail_message_id, sender_email, sender_name')
              .eq('email_account_id', account.id);

            const orphanedEmails = (dbEmails || []).filter(
              e => !gmailIdSet.has(e.gmail_message_id)
            );

            if (orphanedEmails.length > 0) {
              console.log(`Found ${orphanedEmails.length} orphaned emails to remove`);
              const dbIds = orphanedEmails.map(e => e.id);
              await supabase.from('emails').delete().in('id', dbIds);

              const senderCounts = new Map<string, number>();
              for (const email of orphanedEmails) {
                const key = `${email.sender_email}|||${email.sender_name}`;
                senderCounts.set(key, (senderCounts.get(key) || 0) + 1);
              }

              for (const [key, count] of senderCounts) {
                const [senderEmail, senderName] = key.split('|||');
                await supabase.rpc('decrement_sender_count', {
                  p_account_id: account.id,
                  p_sender_email: senderEmail,
                  p_sender_name: senderName,
                  p_count: count
                });

                const { data: remainingEmails } = await supabase
                  .from('emails')
                  .select('received_at')
                  .eq('email_account_id', account.id)
                  .eq('sender_email', senderEmail)
                  .eq('sender_name', senderName)
                  .order('received_at', { ascending: false })
                  .limit(1);

                if (remainingEmails && remainingEmails.length > 0) {
                  await supabase
                    .from('email_senders')
                    .update({ last_email_date: remainingEmails[0].received_at, updated_at: new Date().toISOString() })
                    .eq('email_account_id', account.id)
                    .eq('sender_email', senderEmail)
                    .eq('sender_name', senderName);
                }
              }

              orphanedCount = orphanedEmails.length;
              console.log(`Removed ${orphanedEmails.length} orphaned emails from ${senderCounts.size} senders`);
            } else {
              console.log('No orphaned emails found');
            }

            // Mark full orphan check as done
            await supabase
              .from('email_accounts')
              .update({ full_orphan_check_done: true })
              .eq('id', account.id);
          }
        }
      } else {
        // Bootstrap: No history_id yet, do full comparison once
        console.log('No history_id found, running full orphan detection (one-time)...');
        const gmailIds = await listAllMessageIds(accessToken);
        const gmailIdSet = new Set(gmailIds);
        console.log(`Fetched ${gmailIds.length} message IDs from Gmail for comparison`);

        // Get all email IDs from our database for this account
        const { data: dbEmails } = await supabase
          .from('emails')
          .select('id, gmail_message_id, sender_email, sender_name')
          .eq('email_account_id', account.id);

        // Find orphaned records (in DB but not in Gmail)
        const orphanedEmails = (dbEmails || []).filter(
          e => !gmailIdSet.has(e.gmail_message_id)
        );

        if (orphanedEmails.length > 0) {
          console.log(`Found ${orphanedEmails.length} orphaned emails to remove`);

          // Delete the orphaned emails from our database
          const dbIds = orphanedEmails.map(e => e.id);
          await supabase.from('emails').delete().in('id', dbIds);

          // Group by sender to update counts
          const senderCounts = new Map<string, number>();
          for (const email of orphanedEmails) {
            const key = `${email.sender_email}|||${email.sender_name}`;
            senderCounts.set(key, (senderCounts.get(key) || 0) + 1);
          }

          // Decrement each sender's email_count and update last_email_date
          for (const [key, count] of senderCounts) {
            const [senderEmail, senderName] = key.split('|||');
            await supabase.rpc('decrement_sender_count', {
              p_account_id: account.id,
              p_sender_email: senderEmail,
              p_sender_name: senderName,
              p_count: count
            });

            // Recalculate last_email_date from remaining emails
            const { data: remainingEmails } = await supabase
              .from('emails')
              .select('received_at')
              .eq('email_account_id', account.id)
              .eq('sender_email', senderEmail)
              .eq('sender_name', senderName)
              .order('received_at', { ascending: false })
              .limit(1);

            if (remainingEmails && remainingEmails.length > 0) {
              await supabase
                .from('email_senders')
                .update({ last_email_date: remainingEmails[0].received_at, updated_at: new Date().toISOString() })
                .eq('email_account_id', account.id)
                .eq('sender_email', senderEmail)
                .eq('sender_name', senderName);
            }
          }

          orphanedCount = orphanedEmails.length;
          console.log(`Removed ${orphanedEmails.length} orphaned emails from ${senderCounts.size} senders`);
        } else {
          console.log('No orphaned emails found');
        }

        // Mark full orphan check as done
        await supabase
          .from('email_accounts')
          .update({ full_orphan_check_done: true })
          .eq('id', account.id);
      }
    }

    // Get current historyId to store for next sync (for both full and incremental)
    if (!newHistoryId) {
      try {
        const profile = await getProfile(accessToken);
        newHistoryId = profile.historyId;
      } catch (e) {
        console.warn('Could not get historyId:', e);
      }
    }

    // Update email account stats
    // For incremental sync, use the merged counts from sendersToUpsert
    // For full sync, use the raw senderStats counts
    const totalEmails = isIncrementalSync
      ? sendersToUpsert.reduce((sum: number, s: any) => sum + s.email_count, 0)
      : senderStats.reduce((sum: number, s: SenderStats) => sum + s.count, 0);
    const newEmailsCount = senderStats.reduce((sum: number, s: SenderStats) => sum + s.count, 0);

    await supabase
      .from('email_accounts')
      .update({
        total_emails: totalEmails,
        last_synced: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(newHistoryId && { history_id: newHistoryId })
      })
      .eq('id', account.id);

    // Sanity check: Validate sender dates match actual emails in DB
    // This catches edge cases where sender dates become stale (e.g., email deleted before orphan detection)
    if (isIncrementalSync && emailRecords.length > 0) {
      const processedSenderEmails = [...new Set(emailRecords.map(e => e.sender_email))];
      console.log(`Validating sender dates for ${processedSenderEmails.length} processed senders...`);

      let fixedDates = 0;
      for (const senderEmail of processedSenderEmails) {
        // Get all sender records for this email address
        const { data: senderRecords } = await supabase
          .from('email_senders')
          .select('id, sender_name, last_email_date')
          .eq('email_account_id', account.id)
          .eq('sender_email', senderEmail);

        for (const sender of senderRecords || []) {
          // Get the actual latest email date from the emails table
          const { data: actualLatest } = await supabase
            .from('emails')
            .select('received_at')
            .eq('email_account_id', account.id)
            .eq('sender_email', senderEmail)
            .eq('sender_name', sender.sender_name)
            .order('received_at', { ascending: false })
            .limit(1);

          if (actualLatest && actualLatest.length > 0) {
            const actualDate = actualLatest[0].received_at;
            if (sender.last_email_date !== actualDate) {
              await supabase
                .from('email_senders')
                .update({ last_email_date: actualDate, updated_at: new Date().toISOString() })
                .eq('id', sender.id);
              fixedDates++;
            }
          }
        }
      }
      if (fixedDates > 0) {
        console.log(`Fixed ${fixedDates} stale sender dates`);
      }
    }

    // Log to activity_log for Recent Activity display
    const updatedSendersCount = sendersToUpdate?.length || 0;
    const orphanedPart = orphanedCount > 0 ? `, ${orphanedCount} deleted` : '';
    const description = isIncrementalSync
      ? `Quick sync: ${insertedSenders} new senders, ${updatedSendersCount} updated${orphanedPart}`
      : `Full sync: ${totalEmails.toLocaleString()} emails from ${senderStats.length} senders`;
    await supabase
      .from('activity_log')
      .insert({
        user_id: user.userId,
        action_type: 'email_sync',
        description,
        metadata: { totalEmails, newEmails: newEmailsCount, totalSenders: senderStats.length, email, syncType: isIncrementalSync ? 'quick' : 'full', deletedEmails: orphanedCount }
      });

    // Check if sender inserts failed
    if (failedSenders > 0 && insertedSenders === 0 && !isIncrementalSync) {
      console.error('All sender inserts failed:', lastInsertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save sender data to database',
        details: lastInsertError?.message || 'Unknown database error',
        code: 'SENDER_INSERT_FAILED'
      });
    }

    return res.status(200).json({
      success: true,
      totalSenders: insertedSenders,
      updatedSenders: updatedSendersCount,
      totalEmails,
      deletedEmails: orphanedCount,
      message: 'Email sync completed successfully',
      syncType: isIncrementalSync ? 'quick' : 'full',
      ...(failedSenders > 0 ? { warning: `${failedSenders} senders failed to save` } : {})
    });

  } catch (error: any) {
    console.error('Email sync error:', error);

    // Handle token errors
    if (error.message.includes('Gmail not connected')) {
      // Update account status
      await supabase
        .from('email_accounts')
        .update({
          connection_status: 'expired',
          updated_at: new Date().toISOString()
        })
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
