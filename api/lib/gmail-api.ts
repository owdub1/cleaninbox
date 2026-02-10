/**
 * Gmail API Client
 *
 * Provides methods to interact with Gmail API:
 * - List messages
 * - Get message details
 * - Delete/Archive messages
 * - Extract unsubscribe links
 */

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_CONCURRENT: 10,         // Max parallel requests (Gmail allows ~25, we use 10 for safety)
  REQUESTS_PER_SECOND: 40,    // Target 40/sec (limit is 50/sec)
  DELAY_BETWEEN_BATCHES: 250, // 250ms between batches
  MAX_RETRIES: 3,             // Retry failed requests up to 3 times
  INITIAL_BACKOFF_MS: 1000,   // Start with 1 second backoff
  MAX_BACKOFF_MS: 32000,      // Max 32 second backoff
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff with jitter
 */
function getBackoffMs(attempt: number): number {
  const exponentialBackoff = RATE_LIMIT.INITIAL_BACKOFF_MS * Math.pow(2, attempt);
  const cappedBackoff = Math.min(exponentialBackoff, RATE_LIMIT.MAX_BACKOFF_MS);
  // Add 0-50% jitter to prevent thundering herd
  const jitter = cappedBackoff * Math.random() * 0.5;
  return cappedBackoff + jitter;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload?: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
    }>;
  };
  internalDate: string;
}

export interface GmailMessageList {
  messages: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailHistoryRecord {
  id: string;
  messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
  messagesDeleted?: Array<{ message: { id: string; threadId: string } }>;
  labelsAdded?: Array<{ message: { id: string }; labelIds: string[] }>;
  labelsRemoved?: Array<{ message: { id: string }; labelIds: string[] }>;
}

export interface GmailHistoryList {
  history?: GmailHistoryRecord[];
  nextPageToken?: string;
  historyId: string;
}

export interface SenderStats {
  email: string;
  name: string;
  count: number;
  unreadCount: number;
  firstDate: string;
  lastDate: string;
  unsubscribeLink?: string;
  hasUnsubscribe: boolean;
  isNewsletter: boolean;
  isPromotional: boolean;
  messageIds: string[];
}

export interface EmailRecord {
  gmail_message_id: string;
  sender_email: string;
  sender_name: string;
  subject: string;
  snippet: string;
  received_at: string;
  is_unread: boolean;
  thread_id: string;
  labels: string[];
}

export interface SyncResult {
  senders: SenderStats[];
  emails: EmailRecord[];
}

/**
 * Make authenticated request to Gmail API with retry logic
 */
async function gmailRequest(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<any> {
  const response = await fetch(`${GMAIL_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();

    // Handle rate limit errors with exponential backoff
    if ((response.status === 429 || response.status === 403) && retryCount < RATE_LIMIT.MAX_RETRIES) {
      const backoffMs = getBackoffMs(retryCount);
      console.warn(`Rate limited (${response.status}), retrying in ${Math.round(backoffMs)}ms (attempt ${retryCount + 1}/${RATE_LIMIT.MAX_RETRIES})`);
      await sleep(backoffMs);
      return gmailRequest(accessToken, endpoint, options, retryCount + 1);
    }

    // Only log full error for non-rate-limit errors or after all retries exhausted
    if (response.status !== 429 && response.status !== 403) {
      console.error('Gmail API error response:', response.status, error);
    }
    throw new Error(`Gmail API error: ${response.status} - ${error}`);
  }

  // Handle empty responses (like successful deletes)
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * List messages from Gmail inbox
 */
export async function listMessages(
  accessToken: string,
  options: {
    maxResults?: number;
    pageToken?: string;
    q?: string;
    labelIds?: string[];
  } = {}
): Promise<GmailMessageList> {
  const params = new URLSearchParams();
  if (options.maxResults) params.set('maxResults', options.maxResults.toString());
  if (options.pageToken) params.set('pageToken', options.pageToken);
  if (options.q) params.set('q', options.q);
  if (options.labelIds) params.set('labelIds', options.labelIds.join(','));

  const queryString = params.toString();
  const endpoint = `/messages${queryString ? `?${queryString}` : ''}`;

  const result = await gmailRequest(accessToken, endpoint);
  const messageCount = result?.messages?.length || 0;
  console.log(`Gmail API: listed ${messageCount} messages`);
  return result;
}

/**
 * Get Gmail user profile (includes current historyId)
 */
export async function getProfile(accessToken: string): Promise<GmailProfile> {
  return gmailRequest(accessToken, '/profile');
}

/**
 * List history of changes since a given historyId
 * Returns deleted message IDs and other changes
 */
export async function listHistory(
  accessToken: string,
  startHistoryId: string,
  options: { maxResults?: number; pageToken?: string } = {}
): Promise<GmailHistoryList> {
  const params = new URLSearchParams();
  params.set('startHistoryId', startHistoryId);
  if (options.maxResults) params.set('maxResults', options.maxResults.toString());
  if (options.pageToken) params.set('pageToken', options.pageToken);

  return gmailRequest(accessToken, `/history?${params.toString()}`);
}

/**
 * Get all changes since a given historyId (additions, deletions, trash moves)
 * Uses Gmail History API for fast incremental sync
 */
export async function getHistoryChanges(
  accessToken: string,
  startHistoryId: string
): Promise<{
  addedMessageIds: string[];
  deletedMessageIds: string[];
  newHistoryId: string;
  historyExpired: boolean;
}> {
  const addedMessageIds: string[] = [];
  const deletedMessageIds: string[] = [];
  let pageToken: string | undefined;
  let newHistoryId = startHistoryId;

  try {
    while (true) {
      const response = await listHistory(accessToken, startHistoryId, {
        maxResults: 100,
        pageToken,
      });

      newHistoryId = response.historyId;

      if (response.history) {
        for (const record of response.history) {
          // Catch new messages added to inbox
          if (record.messagesAdded) {
            addedMessageIds.push(...record.messagesAdded.map(m => m.message.id));
          }
          // Catch permanently deleted messages
          if (record.messagesDeleted) {
            deletedMessageIds.push(...record.messagesDeleted.map(m => m.message.id));
          }
          // Catch messages moved to trash (labelsAdded with TRASH label)
          if (record.labelsAdded) {
            for (const labelChange of record.labelsAdded) {
              if (labelChange.labelIds?.includes('TRASH')) {
                deletedMessageIds.push(labelChange.message.id);
              }
            }
          }
        }
      }

      if (!response.nextPageToken) break;
      pageToken = response.nextPageToken;
    }
  } catch (error: any) {
    // History may be expired (Gmail only keeps ~30 days)
    if (error.message?.includes('404') || error.message?.includes('historyId')) {
      console.log('History expired, will need full sync');
      return { addedMessageIds: [], deletedMessageIds: [], newHistoryId: startHistoryId, historyExpired: true };
    }
    throw error;
  }

  return { addedMessageIds, deletedMessageIds, newHistoryId, historyExpired: false };
}

/**
 * Get all deleted message IDs since a given historyId
 * Uses Gmail History API for fast detection of deletions
 * @deprecated Use getHistoryChanges instead
 */
export async function getDeletedMessageIds(
  accessToken: string,
  startHistoryId: string
): Promise<{ deletedIds: string[]; newHistoryId: string }> {
  const { deletedMessageIds, newHistoryId } = await getHistoryChanges(accessToken, startHistoryId);
  return { deletedIds: deletedMessageIds, newHistoryId };
}

/**
 * List all message IDs from Gmail (lightweight, no content)
 * Used for orphan detection during sync
 */
export async function listAllMessageIds(
  accessToken: string,
  query: string = '-in:sent -in:drafts -in:trash -in:spam'
): Promise<string[]> {
  const allIds: string[] = [];
  let pageToken: string | undefined;

  while (true) {
    const response = await listMessages(accessToken, {
      maxResults: 100,
      pageToken,
      q: query,
    });

    if (!response.messages || response.messages.length === 0) break;
    allIds.push(...response.messages.map(m => m.id));

    if (!response.nextPageToken) break;
    pageToken = response.nextPageToken;
    await sleep(100); // Rate limiting
  }

  return allIds;
}

/**
 * Get message details with specific headers
 */
export async function getMessage(
  accessToken: string,
  messageId: string,
  format: 'full' | 'metadata' | 'minimal' = 'metadata',
  metadataHeaders?: string[]
): Promise<GmailMessage> {
  let endpoint = `/messages/${messageId}?format=${format}`;

  // When using metadata format, explicitly request the headers we need
  // This is faster than 'full' format and more reliable
  if (format === 'metadata' && metadataHeaders && metadataHeaders.length > 0) {
    const headersParam = metadataHeaders.map(h => `metadataHeaders=${encodeURIComponent(h)}`).join('&');
    endpoint += `&${headersParam}`;
  }

  return gmailRequest(accessToken, endpoint);
}

/**
 * Batch get multiple messages with rate limiting
 * Uses conservative settings to avoid Gmail API rate limits
 */
export async function batchGetMessages(
  accessToken: string,
  messageIds: string[],
  format: 'full' | 'metadata' | 'minimal' = 'metadata',
  metadataHeaders?: string[]
): Promise<GmailMessage[]> {
  // Conservative rate limiting to stay well under Gmail's limits
  // - 10 concurrent requests (Gmail allows ~25)
  // - 250ms delay between batches (~40 req/sec, limit is 50)
  const BATCH_SIZE = RATE_LIMIT.MAX_CONCURRENT;
  const DELAY_MS = RATE_LIMIT.DELAY_BETWEEN_BATCHES;
  const results: GmailMessage[] = [];
  let failedCount = 0;

  console.log(`Fetching ${messageIds.length} message details in batches of ${BATCH_SIZE} with ${DELAY_MS}ms delay (format: ${format})...`);

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);

    // Process batch with parallel requests
    const batchResults = await Promise.all(
      batch.map(id => getMessage(accessToken, id, format, metadataHeaders).catch((err) => {
        failedCount++;
        return null;
      }))
    );

    results.push(...batchResults.filter(Boolean) as GmailMessage[]);

    // Delay between batches to respect rate limits
    if (i + BATCH_SIZE < messageIds.length) {
      await sleep(DELAY_MS);
    }

    // Log progress every 100 messages or at the end
    const processed = Math.min(i + BATCH_SIZE, messageIds.length);
    if (processed % 100 === 0 || processed >= messageIds.length) {
      console.log(`Processed ${processed}/${messageIds.length} messages`);
    }
  }

  if (failedCount > 0) {
    console.warn(`Warning: ${failedCount} messages failed to fetch`);
  }

  return results;
}

/**
 * Delete a message (move to trash)
 */
export async function trashMessage(
  accessToken: string,
  messageId: string
): Promise<void> {
  await gmailRequest(accessToken, `/messages/${messageId}/trash`, {
    method: 'POST',
  });
}

/**
 * Permanently delete a message
 */
export async function deleteMessage(
  accessToken: string,
  messageId: string
): Promise<void> {
  await gmailRequest(accessToken, `/messages/${messageId}`, {
    method: 'DELETE',
  });
}

/**
 * Batch trash messages with rate limiting
 */
export async function batchTrashMessages(
  accessToken: string,
  messageIds: string[]
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  const BATCH_SIZE = RATE_LIMIT.MAX_CONCURRENT;
  const DELAY_MS = RATE_LIMIT.DELAY_BETWEEN_BATCHES;

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(id => trashMessage(accessToken, id))
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        success.push(batch[idx]);
      } else {
        failed.push(batch[idx]);
      }
    });

    // Delay between batches
    if (i + BATCH_SIZE < messageIds.length) {
      await sleep(DELAY_MS);
    }
  }

  return { success, failed };
}

/**
 * Archive a message (remove INBOX label)
 */
export async function archiveMessage(
  accessToken: string,
  messageId: string
): Promise<void> {
  await gmailRequest(accessToken, `/messages/${messageId}/modify`, {
    method: 'POST',
    body: JSON.stringify({
      removeLabelIds: ['INBOX'],
    }),
  });
}

/**
 * Batch archive messages with rate limiting
 */
export async function batchArchiveMessages(
  accessToken: string,
  messageIds: string[]
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  const BATCH_SIZE = RATE_LIMIT.MAX_CONCURRENT;
  const DELAY_MS = RATE_LIMIT.DELAY_BETWEEN_BATCHES;

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(id => archiveMessage(accessToken, id))
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        success.push(batch[idx]);
      } else {
        failed.push(batch[idx]);
      }
    });

    // Delay between batches
    if (i + BATCH_SIZE < messageIds.length) {
      await sleep(DELAY_MS);
    }
  }

  return { success, failed };
}

/**
 * Extract header value from message
 */
function getHeader(message: GmailMessage, headerName: string): string | undefined {
  const header = message.payload?.headers?.find(
    h => h.name.toLowerCase() === headerName.toLowerCase()
  );
  return header?.value;
}

/**
 * Parse sender from From header
 */
function parseSender(fromHeader: string): { email: string; name: string } {
  // Handle formats like:
  // "John Doe <john@example.com>"
  // "john@example.com"
  // "<john@example.com>"
  // John Doe <john@example.com>

  const trimmed = fromHeader.trim();

  // Handle empty or invalid input
  if (!trimmed || trimmed === '<>' || trimmed === '""' || trimmed === "''") {
    return { name: '', email: '' };
  }

  // Check for format: Name <email@domain.com> or "Name" <email@domain.com>
  const angleMatch = trimmed.match(/^(?:"?(.+?)"?\s*)?<([^<>]+@[^<>]+)>$/);
  if (angleMatch) {
    return {
      name: (angleMatch[1] || '').trim().replace(/^["']|["']$/g, ''),
      email: angleMatch[2].toLowerCase().trim(),
    };
  }

  // Check for plain email address (no angle brackets, no name)
  const plainEmailMatch = trimmed.match(/^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  if (plainEmailMatch) {
    return {
      name: '',
      email: plainEmailMatch[1].toLowerCase().trim(),
    };
  }

  // Fallback: try to extract any email-like pattern
  const emailExtract = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailExtract) {
    // Get the part before the email as the name
    const emailIndex = trimmed.indexOf(emailExtract[1]);
    const namePart = trimmed.substring(0, emailIndex).trim().replace(/[<>"']/g, '').trim();
    return {
      name: namePart,
      email: emailExtract[1].toLowerCase().trim(),
    };
  }

  // Last resort: return the whole thing as email
  return {
    name: '',
    email: trimmed.toLowerCase(),
  };
}

/**
 * Extract unsubscribe link from headers
 */
function extractUnsubscribeLink(message: GmailMessage): string | undefined {
  const listUnsubscribe = getHeader(message, 'List-Unsubscribe');
  if (!listUnsubscribe) return undefined;

  // Parse List-Unsubscribe header - can contain mailto: and/or http(s): URLs
  // Format: <mailto:unsubscribe@example.com>, <https://example.com/unsubscribe>

  // Prefer HTTPS links over mailto
  const httpMatch = listUnsubscribe.match(/<(https?:\/\/[^>]+)>/);
  if (httpMatch) {
    return httpMatch[1];
  }

  // Fall back to mailto
  const mailtoMatch = listUnsubscribe.match(/<(mailto:[^>]+)>/);
  if (mailtoMatch) {
    return mailtoMatch[1];
  }

  return undefined;
}

/**
 * Check if message is likely promotional
 */
function isPromotional(message: GmailMessage): boolean {
  return message.labelIds?.includes('CATEGORY_PROMOTIONS') || false;
}

/**
 * Check if message is likely a newsletter
 */
function isNewsletter(message: GmailMessage): boolean {
  const listUnsubscribe = getHeader(message, 'List-Unsubscribe');
  const hasPromotions = message.labelIds?.includes('CATEGORY_PROMOTIONS');
  const hasUpdates = message.labelIds?.includes('CATEGORY_UPDATES');

  return !!(listUnsubscribe && (hasPromotions || hasUpdates));
}

/**
 * Get subject from message headers
 */
function getSubject(message: GmailMessage): string {
  return getHeader(message, 'Subject') || '(No Subject)';
}

/**
 * Create composite key for sender (name + email)
 */
function getSenderKey(email: string, name: string): string {
  return `${name}|||${email}`;
}

/**
 * Aggregate messages by sender to get statistics
 * Uses composite key (name + email) to differentiate senders with same email but different names
 */
export function aggregateBySender(messages: GmailMessage[]): Map<string, SenderStats> {
  const senderMap = new Map<string, SenderStats>();

  console.log(`Aggregating ${messages.length} messages by sender (name+email)...`);

  // Debug: log first message structure
  if (messages.length > 0) {
    const firstMsg = messages[0];
    console.log('First message structure:', JSON.stringify({
      id: firstMsg?.id,
      hasPayload: !!firstMsg?.payload,
      headers: firstMsg?.payload?.headers?.map(h => h.name) || 'no headers'
    }));
  }

  let skippedNoFrom = 0;
  for (const message of messages) {
    const fromHeader = getHeader(message, 'From');
    if (!fromHeader) {
      skippedNoFrom++;
      continue;
    }

    const { email, name } = parseSender(fromHeader);
    const senderName = name || email; // Use email as name if no name provided
    const compositeKey = getSenderKey(email, senderName);
    const messageDate = new Date(parseInt(message.internalDate)).toISOString();
    const unsubscribeLink = extractUnsubscribeLink(message);
    const isUnread = message.labelIds?.includes('UNREAD') || false;

    if (!senderMap.has(compositeKey)) {
      senderMap.set(compositeKey, {
        email,
        name: senderName,
        count: 0,
        unreadCount: 0,
        firstDate: messageDate,
        lastDate: messageDate,
        unsubscribeLink,
        hasUnsubscribe: !!unsubscribeLink,
        isNewsletter: isNewsletter(message),
        isPromotional: isPromotional(message),
        messageIds: [],
      });
    }

    const stats = senderMap.get(compositeKey)!;
    stats.count++;
    if (isUnread) stats.unreadCount++;
    stats.messageIds.push(message.id);

    // Update date range
    if (messageDate < stats.firstDate) stats.firstDate = messageDate;
    if (messageDate > stats.lastDate) stats.lastDate = messageDate;

    // Update unsubscribe link if we found one
    if (unsubscribeLink && !stats.unsubscribeLink) {
      stats.unsubscribeLink = unsubscribeLink;
      stats.hasUnsubscribe = true;
    }

    // Update newsletter/promotional flags
    if (isNewsletter(message)) stats.isNewsletter = true;
    if (isPromotional(message)) stats.isPromotional = true;
  }

  console.log(`Aggregation complete: ${senderMap.size} senders (by name+email), skipped ${skippedNoFrom} messages without From header`);
  return senderMap;
}

/**
 * Extract individual email records from messages for storage
 */
export function extractEmailRecords(messages: GmailMessage[]): EmailRecord[] {
  const records: EmailRecord[] = [];

  for (const message of messages) {
    const fromHeader = getHeader(message, 'From');
    if (!fromHeader) continue;

    const { email, name } = parseSender(fromHeader);
    const senderName = name || email;

    records.push({
      gmail_message_id: message.id,
      sender_email: email,
      sender_name: senderName,
      subject: getSubject(message),
      snippet: message.snippet || '',
      received_at: new Date(parseInt(message.internalDate)).toISOString(),
      is_unread: message.labelIds?.includes('UNREAD') || false,
      thread_id: message.threadId,
      labels: message.labelIds || [],
    });
  }

  return records;
}

/**
 * List all messages from a specific sender
 */
export async function listMessagesBySender(
  accessToken: string,
  senderEmail: string,
  maxResults: number = 500
): Promise<string[]> {
  const messageIds: string[] = [];
  let pageToken: string | undefined;

  while (messageIds.length < maxResults) {
    const response = await listMessages(accessToken, {
      maxResults: Math.min(100, maxResults - messageIds.length),
      pageToken,
      q: `from:${senderEmail}`,
    });

    if (!response.messages || response.messages.length === 0) break;

    messageIds.push(...response.messages.map(m => m.id));

    if (!response.nextPageToken) break;
    pageToken = response.nextPageToken;
  }

  return messageIds;
}

/**
 * Delete all emails from a specific sender
 */
export async function deleteEmailsFromSender(
  accessToken: string,
  senderEmail: string
): Promise<{ deletedCount: number; messageIds: string[] }> {
  const messageIds = await listMessagesBySender(accessToken, senderEmail);

  if (messageIds.length === 0) {
    return { deletedCount: 0, messageIds: [] };
  }

  const { success } = await batchTrashMessages(accessToken, messageIds);

  return { deletedCount: success.length, messageIds: success };
}

/**
 * Archive all emails from a specific sender
 */
export async function archiveEmailsFromSender(
  accessToken: string,
  senderEmail: string
): Promise<{ archivedCount: number; messageIds: string[] }> {
  const messageIds = await listMessagesBySender(accessToken, senderEmail);

  if (messageIds.length === 0) {
    return { archivedCount: 0, messageIds: [] };
  }

  const { success } = await batchArchiveMessages(accessToken, messageIds);

  return { archivedCount: success.length, messageIds: success };
}

/**
 * Fetch and aggregate sender statistics from Gmail
 * @param afterDate - Optional date for incremental sync (only fetch emails after this date)
 * @returns SyncResult containing both aggregated sender stats and individual email records
 */
export async function fetchSenderStats(
  accessToken: string,
  maxMessages: number = 1000,
  afterDate?: Date
): Promise<SyncResult> {
  // Fetch message list
  const allMessageRefs: Array<{ id: string; threadId: string }> = [];
  let pageToken: string | undefined;

  // Build query - exclude sent/drafts/trash/spam, optionally filter by date
  let query = '-in:sent -in:drafts -in:trash -in:spam';
  if (afterDate) {
    // Use epoch seconds for precise timestamp filtering (avoids date boundary issues)
    // Gmail's after: operator accepts epoch seconds for exact timestamp matching
    const epochSeconds = Math.floor(afterDate.getTime() / 1000);
    query += ` after:${epochSeconds}`;
    console.log(`Incremental sync: fetching emails after ${afterDate.toISOString()} (epoch: ${epochSeconds})`);
  }

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

    // Small delay between pagination requests
    await sleep(100);
  }

  if (allMessageRefs.length === 0) {
    console.log('No messages found in Gmail' + (afterDate ? ' since last sync' : ''));
    return { senders: [], emails: [] };
  }

  console.log(`Gmail API listed ${allMessageRefs.length} messages to fetch` + (afterDate ? ' (incremental)' : ' (full)'));

  // Get message details - use 'metadata' format with explicit headers for performance
  // This is much faster than 'full' format and avoids rate limiting issues
  const messageIds = allMessageRefs.map(m => m.id);
  const requiredHeaders = ['From', 'List-Unsubscribe', 'List-Unsubscribe-Post', 'Date', 'Subject'];
  const messages = await batchGetMessages(accessToken, messageIds, 'metadata', requiredHeaders);

  console.log(`Successfully fetched ${messages.length} of ${messageIds.length} messages (${messageIds.length - messages.length} failed)`);

  // Aggregate by sender (using composite key: name + email)
  const senderMap = aggregateBySender(messages);

  // Extract individual email records for storage
  const emails = extractEmailRecords(messages);

  // Convert senders to array and sort by count
  const senders = Array.from(senderMap.values()).sort((a, b) => b.count - a.count);

  return { senders, emails };
}
