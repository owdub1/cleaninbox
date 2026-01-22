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

/**
 * Make authenticated request to Gmail API
 */
async function gmailRequest(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
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
    console.error('Gmail API error response:', response.status, error);
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
 * Get full message details
 */
export async function getMessage(
  accessToken: string,
  messageId: string,
  format: 'full' | 'metadata' | 'minimal' = 'full'
): Promise<GmailMessage> {
  // Use format=full to ensure headers are always returned
  // metadata format with metadataHeaders can be unreliable
  return gmailRequest(
    accessToken,
    `/messages/${messageId}?format=${format}`
  );
}

/**
 * Batch get multiple messages with rate limiting
 */
export async function batchGetMessages(
  accessToken: string,
  messageIds: string[],
  format: 'full' | 'metadata' | 'minimal' = 'metadata'
): Promise<GmailMessage[]> {
  // Gmail rate limits: 250 quota units per second per user
  // getMessage uses ~5 quota units, so max ~50/sec
  // Use smaller batches with delays to avoid rate limits
  const BATCH_SIZE = 10; // Reduced from 50
  const DELAY_MS = 200; // Delay between batches
  const results: GmailMessage[] = [];

  console.log(`Fetching ${messageIds.length} message details in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(id => getMessage(accessToken, id, format).catch((err) => {
        console.warn(`Failed to get message ${id}:`, err.message);
        return null;
      }))
    );
    results.push(...batchResults.filter(Boolean) as GmailMessage[]);

    // Add delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < messageIds.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    // Log progress every 100 messages
    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= messageIds.length) {
      console.log(`Processed ${Math.min(i + BATCH_SIZE, messageIds.length)}/${messageIds.length} messages`);
    }
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
 * Batch trash messages
 */
export async function batchTrashMessages(
  accessToken: string,
  messageIds: string[]
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  // Process in parallel batches
  const BATCH_SIZE = 25;
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
 * Batch archive messages
 */
export async function batchArchiveMessages(
  accessToken: string,
  messageIds: string[]
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  const BATCH_SIZE = 25;
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
 * Aggregate messages by sender to get statistics
 */
export function aggregateBySender(messages: GmailMessage[]): Map<string, SenderStats> {
  const senderMap = new Map<string, SenderStats>();

  console.log(`Aggregating ${messages.length} messages by sender...`);

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
    const messageDate = new Date(parseInt(message.internalDate)).toISOString();
    const unsubscribeLink = extractUnsubscribeLink(message);
    const isUnread = message.labelIds?.includes('UNREAD') || false;

    if (!senderMap.has(email)) {
      senderMap.set(email, {
        email,
        name: name || email,
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

    const stats = senderMap.get(email)!;
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

  console.log(`Aggregation complete: ${senderMap.size} senders, skipped ${skippedNoFrom} messages without From header`);
  return senderMap;
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
 */
export async function fetchSenderStats(
  accessToken: string,
  maxMessages: number = 1000
): Promise<SenderStats[]> {
  // Fetch message list
  const allMessageRefs: Array<{ id: string; threadId: string }> = [];
  let pageToken: string | undefined;

  while (allMessageRefs.length < maxMessages) {
    const response = await listMessages(accessToken, {
      maxResults: Math.min(100, maxMessages - allMessageRefs.length),
      pageToken,
    });

    if (!response.messages || response.messages.length === 0) break;

    allMessageRefs.push(...response.messages);

    if (!response.nextPageToken) break;
    pageToken = response.nextPageToken;
  }

  if (allMessageRefs.length === 0) {
    return [];
  }

  // Get message details
  const messageIds = allMessageRefs.map(m => m.id);
  const messages = await batchGetMessages(accessToken, messageIds, 'metadata');

  // Aggregate by sender
  const senderMap = aggregateBySender(messages);

  // Convert to array and sort by count
  return Array.from(senderMap.values()).sort((a, b) => b.count - a.count);
}
