/**
 * Outlook Sync Helper Module
 *
 * Handles full and incremental sync for Outlook accounts using Microsoft Graph API.
 * Called from the main sync.ts endpoint when account provider is Outlook.
 */

import type { VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import {
  listInboxMessages,
  batchGetMessages,
  getDeltaMessages,
  getInitialDeltaLink,
  extractUnsubscribeLink,
  extractMailtoUnsubscribeLink,
  OutlookMessage
} from '../lib/outlook-api.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BATCH_SIZE = 100;

/**
 * Outlook Full Sync: Delete all existing data and rebuild from Graph API
 */
export async function performOutlookFullSync(
  res: VercelResponse,
  userId: string,
  accountId: string,
  accessToken: string,
  userEmail: string,
  emailLimit: number,
  email: string
) {
  const maxMessages = Math.min(10000, emailLimit);
  console.log(`Outlook full sync: fetching up to ${maxMessages} emails`);

  // Step 1: Fetch all message IDs from inbox
  const allMessages: OutlookMessage[] = [];
  let nextLink: string | undefined;

  while (allMessages.length < maxMessages) {
    const response = await listInboxMessages(accessToken, {
      top: Math.min(100, maxMessages - allMessages.length),
      nextLink,
      orderBy: 'receivedDateTime desc',
    });

    if (!response.value || response.value.length === 0) break;
    allMessages.push(...response.value);

    if (!response['@odata.nextLink']) break;
    nextLink = response['@odata.nextLink'];
  }

  console.log(`Outlook full sync: found ${allMessages.length} messages`);

  if (allMessages.length === 0) {
    console.warn('Outlook full sync: returned 0 messages - keeping existing data');
    return res.status(200).json({
      success: true,
      totalSenders: 0,
      totalEmails: 0,
      message: 'No emails found - existing data preserved',
      warning: 'Outlook returned no emails. Check if account has proper permissions.',
      syncType: 'full'
    });
  }

  // Step 2: Batch fetch message details with headers
  // The list response doesn't include internetMessageHeaders, so we need to fetch individually
  const messageIds = allMessages.map(m => m.id);
  const messagesWithHeaders = await batchGetMessages(accessToken, messageIds);
  console.log(`Outlook full sync: fetched ${messagesWithHeaders.length} message details`);

  // Step 3: Delete existing emails and senders
  console.log('Outlook full sync: clearing existing data');
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
    _unsub_link_date?: string;
    _mailto_unsub_link_date?: string;
  }>();

  for (const msg of messagesWithHeaders) {
    if (!msg.from?.emailAddress?.address) continue;

    const senderEmail = msg.from.emailAddress.address.toLowerCase();
    const senderName = msg.from.emailAddress.name || senderEmail;
    if (senderEmail === userEmail) continue;

    const receivedAt = new Date(msg.receivedDateTime).toISOString();
    const isUnread = !msg.isRead;

    emailsToInsert.push({
      gmail_message_id: msg.id,
      email_account_id: accountId,
      sender_email: senderEmail,
      sender_name: senderName,
      subject: msg.subject || '(No Subject)',
      snippet: msg.bodyPreview || '',
      received_at: receivedAt,
      is_unread: isUnread,
      thread_id: msg.conversationId || msg.id,
      labels: [],
    });

    // Update sender stats
    const senderKey = `${senderEmail}|||${senderName}`;
    const existing = senderStats.get(senderKey);
    const unsubscribeLink = extractUnsubscribeLink(msg);
    const mailtoUnsubscribeLink = extractMailtoUnsubscribeLink(msg);
    const unsubscribePostHeader = msg.internetMessageHeaders?.find(
      h => h.name.toLowerCase() === 'list-unsubscribe-post'
    )?.value || '';
    const hasOneClick = unsubscribePostHeader.toLowerCase().includes('list-unsubscribe=one-click');

    if (existing) {
      existing.email_count++;
      if (isUnread) existing.unread_count++;
      if (receivedAt < existing.first_email_date) existing.first_email_date = receivedAt;
      if (receivedAt > existing.last_email_date) existing.last_email_date = receivedAt;
      if (unsubscribeLink && (!existing._unsub_link_date || receivedAt > existing._unsub_link_date)) {
        existing.unsubscribe_link = unsubscribeLink;
        existing.has_unsubscribe = true;
        existing.has_one_click_unsubscribe = hasOneClick;
        existing._unsub_link_date = receivedAt;
      }
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
        unsubscribe_link: unsubscribeLink || null,
        mailto_unsubscribe_link: mailtoUnsubscribeLink || null,
        has_unsubscribe: !!unsubscribeLink,
        has_one_click_unsubscribe: hasOneClick,
        is_newsletter: !!unsubscribeLink, // Outlook: no category labels, rely on header
        is_promotional: false,
        _unsub_link_date: unsubscribeLink ? receivedAt : undefined,
        _mailto_unsub_link_date: mailtoUnsubscribeLink ? receivedAt : undefined,
      });
    }
  }

  // Step 5: Insert emails in batches
  console.log(`Outlook full sync: inserting ${emailsToInsert.length} emails`);
  for (let i = 0; i < emailsToInsert.length; i += BATCH_SIZE) {
    const batch = emailsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('emails').insert(batch);
    if (error) console.error('Email insert error:', error.message);
  }

  // Step 6: Insert senders
  const sendersToInsert = Array.from(senderStats.values()).map(({ _unsub_link_date, _mailto_unsub_link_date, ...s }) => ({
    user_id: userId,
    email_account_id: accountId,
    ...s,
    updated_at: new Date().toISOString()
  }));

  console.log(`Outlook full sync: inserting ${sendersToInsert.length} senders`);
  for (let i = 0; i < sendersToInsert.length; i += BATCH_SIZE) {
    const batch = sendersToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('email_senders').insert(batch);
    if (error) console.error('Sender insert error:', error.message);
  }

  // Step 7: Get initial delta link for future incremental syncs
  let deltaLink: string | undefined;
  try {
    deltaLink = await getInitialDeltaLink(accessToken);
  } catch (e) {
    console.warn('Could not get initial delta link:', e);
  }

  // Step 8: Update account stats
  const totalEmails = emailsToInsert.length;
  await supabase
    .from('email_accounts')
    .update({
      total_emails: totalEmails,
      last_synced: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(deltaLink && { delta_link: deltaLink })
    })
    .eq('id', accountId);

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: userId,
    action_type: 'email_sync',
    description: `Full sync: ${totalEmails.toLocaleString()} emails from ${sendersToInsert.length} senders`,
    metadata: { email, syncType: 'full', provider: 'Outlook', totalEmails, totalSenders: sendersToInsert.length }
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
 * Outlook Incremental Sync: Use delta query for reliable sync
 */
export async function performOutlookIncrementalSync(
  res: VercelResponse,
  userId: string,
  accountId: string,
  accessToken: string,
  userEmail: string,
  email: string,
  lastSyncedAt: string,
  storedDeltaLink: string | null
) {
  let addedCount = 0;
  let deletedCount = 0;
  const affectedSenders = new Set<string>();
  let syncMethod = 'delta';
  let newDeltaLink: string | undefined;

  if (storedDeltaLink) {
    console.log('Outlook incremental sync: using delta query');

    try {
      const deltaResult = await getDeltaMessages(accessToken, storedDeltaLink);
      newDeltaLink = deltaResult.newDeltaLink;

      console.log(`Delta query: ${deltaResult.messages.length} added/modified, ${deltaResult.removedIds.length} removed`);

      // Process new/modified messages
      if (deltaResult.messages.length > 0) {
        // Need headers for unsubscribe detection - batch fetch details
        const messageIds = deltaResult.messages.map(m => m.id);
        const messagesWithHeaders = await batchGetMessages(accessToken, messageIds);

        const result = await processOutlookNewMessages(
          messagesWithHeaders, accountId, userEmail, affectedSenders
        );
        addedCount = result.addedCount;
      }

      // Process removed messages
      if (deltaResult.removedIds.length > 0) {
        const result = await processDeletedMessages(
          accountId, deltaResult.removedIds, affectedSenders
        );
        deletedCount = result.deletedCount;
      }
    } catch (error: any) {
      console.error('Delta query error:', error.message);
      // If delta fails (e.g., 404 or token expired), fall back to timestamp-based
      syncMethod = 'timestamp';
    }
  } else {
    console.log('Outlook incremental sync: no delta link, using timestamp-based sync');
    syncMethod = 'timestamp';
  }

  // Fallback: timestamp-based sync
  if (syncMethod === 'timestamp') {
    const lastSyncDate = new Date(lastSyncedAt);
    const bufferDate = new Date(lastSyncDate.getTime() - 60 * 60 * 1000);
    const filterDate = bufferDate.toISOString();

    console.log(`Timestamp sync: fetching emails after ${filterDate}`);

    const allMessages: OutlookMessage[] = [];
    let nextLink: string | undefined;

    while (allMessages.length < 1000) {
      const response = await listInboxMessages(accessToken, {
        top: 100,
        nextLink,
        filter: `receivedDateTime ge ${filterDate}`,
        orderBy: 'receivedDateTime desc',
      });

      if (!response.value || response.value.length === 0) break;
      allMessages.push(...response.value);

      if (!response['@odata.nextLink']) break;
      nextLink = response['@odata.nextLink'];
    }

    console.log(`Timestamp sync: found ${allMessages.length} messages since last sync`);

    if (allMessages.length > 0) {
      const messageIds = allMessages.map(m => m.id);

      // Find which are new
      const existingIds = new Set<string>();
      for (let i = 0; i < messageIds.length; i += 500) {
        const batch = messageIds.slice(i, i + 500);
        const { data: existingEmails } = await supabase
          .from('emails')
          .select('gmail_message_id')
          .eq('email_account_id', accountId)
          .in('gmail_message_id', batch);

        (existingEmails || []).forEach(e => existingIds.add(e.gmail_message_id));
      }

      const newMessageIds = messageIds.filter(id => !existingIds.has(id));
      console.log(`Timestamp sync: ${newMessageIds.length} new emails to add`);

      if (newMessageIds.length > 0) {
        const messagesWithHeaders = await batchGetMessages(accessToken, newMessageIds);
        const result = await processOutlookNewMessages(
          messagesWithHeaders, accountId, userEmail, affectedSenders
        );
        addedCount = result.addedCount;
      }
    }

    // Try to get a delta link for next time
    try {
      newDeltaLink = await getInitialDeltaLink(accessToken);
    } catch (e) {
      console.warn('Could not get delta link:', e);
    }
  }

  // Recalculate sender stats for affected senders
  if (affectedSenders.size > 0) {
    const senderKeys = Array.from(affectedSenders);
    for (const key of senderKeys) {
      const [senderEmail, senderName] = key.split('|||');
      await recalculateSenderStats(userId, accountId, senderEmail, senderName);
    }
  }

  // Update account
  const now = new Date().toISOString();
  await supabase
    .from('email_accounts')
    .update({
      last_synced: now,
      updated_at: now,
      ...(newDeltaLink && { delta_link: newDeltaLink })
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
      syncType: 'incremental',
      syncMethod,
      provider: 'Outlook',
      addedEmails: addedCount,
      deletedEmails: deletedCount,
    }
  });

  return res.status(200).json({
    success: true,
    totalSenders: affectedSenders.size,
    addedEmails: addedCount,
    deletedEmails: deletedCount,
    message: addedCount > 0 || deletedCount > 0 ? description : 'Inbox is up to date',
    syncType: 'incremental',
    syncMethod
  });
}

/**
 * Process and insert new Outlook messages
 */
async function processOutlookNewMessages(
  messages: OutlookMessage[],
  accountId: string,
  userEmail: string,
  affectedSenders: Set<string>
): Promise<{ addedCount: number }> {
  let addedCount = 0;

  const sendersWithUnsubscribe = new Map<string, {
    unsubscribeLink: string;
    mailtoLink: string | null;
    hasOneClick: boolean;
    receivedAt: string;
  }>();

  for (const msg of messages) {
    if (!msg.from?.emailAddress?.address) continue;

    const senderEmail = msg.from.emailAddress.address.toLowerCase();
    const senderName = msg.from.emailAddress.name || senderEmail;
    if (senderEmail === userEmail) continue;

    const receivedAt = new Date(msg.receivedDateTime).toISOString();

    // Track unsubscribe info
    const unsubscribeLink = extractUnsubscribeLink(msg);
    const mailtoLink = extractMailtoUnsubscribeLink(msg);
    if (unsubscribeLink) {
      const key = `${senderEmail}|||${senderName}`;
      const existing = sendersWithUnsubscribe.get(key);
      const unsubscribePostHeader = msg.internetMessageHeaders?.find(
        h => h.name.toLowerCase() === 'list-unsubscribe-post'
      )?.value || '';
      if (!existing || receivedAt > existing.receivedAt) {
        sendersWithUnsubscribe.set(key, {
          unsubscribeLink,
          mailtoLink: mailtoLink || null,
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
      subject: msg.subject || '(No Subject)',
      snippet: msg.bodyPreview || '',
      received_at: receivedAt,
      is_unread: !msg.isRead,
      thread_id: msg.conversationId || msg.id,
      labels: [],
    });

    if (!error) {
      addedCount++;
      affectedSenders.add(`${senderEmail}|||${senderName}`);
    } else if (error.code === '23505') {
      affectedSenders.add(`${senderEmail}|||${senderName}`);
    }
  }

  // Restore has_unsubscribe for senders
  for (const [key, info] of sendersWithUnsubscribe) {
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

  return { addedCount };
}

/**
 * Process deleted messages
 */
async function processDeletedMessages(
  accountId: string,
  deletedMessageIds: string[],
  affectedSenders: Set<string>
): Promise<{ deletedCount: number }> {
  let deletedCount = 0;

  for (let i = 0; i < deletedMessageIds.length; i += 500) {
    const batch = deletedMessageIds.slice(i, i + 500);

    const { data: emailsToDelete } = await supabase
      .from('emails')
      .select('id, gmail_message_id, sender_email, sender_name')
      .eq('email_account_id', accountId)
      .in('gmail_message_id', batch);

    if (emailsToDelete && emailsToDelete.length > 0) {
      for (const e of emailsToDelete) {
        affectedSenders.add(`${e.sender_email}|||${e.sender_name}`);
      }

      const idsToDelete = emailsToDelete.map(e => e.id);
      await supabase.from('emails').delete().in('id', idsToDelete);
      deletedCount += emailsToDelete.length;
    }
  }

  console.log(`Deleted ${deletedCount} emails from DB based on delta removals`);
  return { deletedCount };
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
  const { data: emails } = await supabase
    .from('emails')
    .select('received_at, is_unread')
    .eq('email_account_id', accountId)
    .eq('sender_email', senderEmail)
    .eq('sender_name', senderName)
    .order('received_at', { ascending: false });

  if (!emails || emails.length === 0) {
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

  const { data: existingSender } = await supabase
    .from('email_senders')
    .select('id')
    .eq('email_account_id', accountId)
    .eq('sender_email', senderEmail)
    .eq('sender_name', senderName)
    .single();

  if (existingSender) {
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
