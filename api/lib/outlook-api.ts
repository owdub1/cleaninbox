/**
 * Outlook (Microsoft Graph) API Client
 *
 * Provides methods to interact with Microsoft Graph Mail API:
 * - List messages
 * - Get message details with headers
 * - Delete/Archive messages
 * - Delta sync for incremental updates
 * - Extract unsubscribe links
 */

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

// Rate limiting configuration (more conservative than Gmail)
const RATE_LIMIT = {
  MAX_CONCURRENT: 4,           // Outlook allows ~4 concurrent (vs Gmail's 10)
  BATCH_SIZE: 20,              // Max 20 requests per $batch (vs Gmail's 100+)
  DELAY_BETWEEN_BATCHES: 500,  // 500ms between batches
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 1000,
  MAX_BACKOFF_MS: 32000,
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getBackoffMs(attempt: number): number {
  const exponentialBackoff = RATE_LIMIT.INITIAL_BACKOFF_MS * Math.pow(2, attempt);
  const cappedBackoff = Math.min(exponentialBackoff, RATE_LIMIT.MAX_BACKOFF_MS);
  const jitter = cappedBackoff * Math.random() * 0.5;
  return cappedBackoff + jitter;
}

// Reuse types from gmail-api for compatibility
export interface SenderStats {
  email: string;
  name: string;
  count: number;
  unreadCount: number;
  firstDate: string;
  lastDate: string;
  unsubscribeLink?: string;
  mailtoUnsubscribeLink?: string;
  hasUnsubscribe: boolean;
  hasOneClickUnsubscribe: boolean;
  isNewsletter: boolean;
  isPromotional: boolean;
  messageIds: string[];
  _unsubLinkDate?: string;
  _mailtoUnsubLinkDate?: string;
}

export interface EmailRecord {
  gmail_message_id: string; // stores Outlook message ID (column name is historical)
  sender_email: string;
  sender_name: string;
  subject: string;
  snippet: string;
  received_at: string;
  is_unread: boolean;
  thread_id: string;
  labels: string[];
}

export interface OutlookMessage {
  id: string;
  conversationId: string;
  subject: string;
  bodyPreview: string;
  receivedDateTime: string;
  isRead: boolean;
  from?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  internetMessageHeaders?: Array<{
    name: string;
    value: string;
  }>;
  parentFolderId?: string;
}

export interface OutlookMessageList {
  value: OutlookMessage[];
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
}

export interface DeltaResponse {
  value: (OutlookMessage & { '@removed'?: { reason: string } })[];
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
}

/**
 * Make authenticated request to Microsoft Graph API with retry logic
 */
async function graphRequest(
  accessToken: string,
  url: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<any> {
  // Support both relative paths and full URLs (for nextLink/deltaLink)
  const fullUrl = url.startsWith('http') ? url : `${GRAPH_API_BASE}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();

    // Handle rate limit (429) and throttling (503) with exponential backoff
    if ((response.status === 429 || response.status === 503) && retryCount < RATE_LIMIT.MAX_RETRIES) {
      // Check for Retry-After header
      const retryAfter = response.headers.get('Retry-After');
      const backoffMs = retryAfter
        ? parseInt(retryAfter) * 1000
        : getBackoffMs(retryCount);
      console.warn(`Rate limited (${response.status}), retrying in ${Math.round(backoffMs)}ms (attempt ${retryCount + 1}/${RATE_LIMIT.MAX_RETRIES})`);
      await sleep(backoffMs);
      return graphRequest(accessToken, url, options, retryCount + 1);
    }

    if (response.status !== 429 && response.status !== 503) {
      console.error('Graph API error response:', response.status, error);
    }
    throw new Error(`Graph API error: ${response.status} - ${error}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * List messages from Outlook inbox
 */
export async function listInboxMessages(
  accessToken: string,
  options: {
    top?: number;
    skip?: number;
    filter?: string;
    select?: string;
    orderBy?: string;
    nextLink?: string;
  } = {}
): Promise<OutlookMessageList> {
  // If we have a nextLink, use it directly
  if (options.nextLink) {
    return graphRequest(accessToken, options.nextLink);
  }

  const params = new URLSearchParams();
  params.set('$top', (options.top || 100).toString());
  if (options.skip) params.set('$skip', options.skip.toString());
  if (options.filter) params.set('$filter', options.filter);
  if (options.orderBy) params.set('$orderby', options.orderBy);
  params.set('$select', options.select || 'id,conversationId,subject,bodyPreview,receivedDateTime,isRead,from,parentFolderId');

  const endpoint = `/me/mailFolders('Inbox')/messages?${params.toString()}`;
  const result = await graphRequest(accessToken, endpoint);
  return result;
}

/**
 * Get a single message with internet message headers
 */
export async function getMessageWithHeaders(
  accessToken: string,
  messageId: string
): Promise<OutlookMessage> {
  const select = 'id,conversationId,subject,bodyPreview,receivedDateTime,isRead,from,internetMessageHeaders,parentFolderId';
  return graphRequest(accessToken, `/me/messages/${messageId}?$select=${select}`);
}

/**
 * Get full message content (body HTML/text)
 */
export async function getFullMessage(
  accessToken: string,
  messageId: string
): Promise<any> {
  return graphRequest(accessToken, `/me/messages/${messageId}?$select=id,conversationId,subject,bodyPreview,receivedDateTime,isRead,from,toRecipients,body,internetMessageHeaders`);
}

/**
 * Batch get messages with headers using $batch API
 * Microsoft Graph limits batches to 20 requests
 */
export async function batchGetMessages(
  accessToken: string,
  messageIds: string[]
): Promise<OutlookMessage[]> {
  const BATCH_SIZE = RATE_LIMIT.BATCH_SIZE;
  const results: OutlookMessage[] = [];
  let failedCount = 0;

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);

    const batchBody = {
      requests: batch.map((id, idx) => ({
        id: String(idx),
        method: 'GET',
        url: `/me/messages/${id}?$select=id,conversationId,subject,bodyPreview,receivedDateTime,isRead,from,internetMessageHeaders,parentFolderId`,
      }))
    };

    try {
      const batchResponse = await graphRequest(accessToken, '/$batch', {
        method: 'POST',
        body: JSON.stringify(batchBody),
      });

      if (batchResponse?.responses) {
        for (const resp of batchResponse.responses) {
          if (resp.status === 200 && resp.body) {
            results.push(resp.body as OutlookMessage);
          } else {
            failedCount++;
          }
        }
      }
    } catch (err) {
      console.error('Batch request failed:', err);
      failedCount += batch.length;
    }

    // Delay between batches
    if (i + BATCH_SIZE < messageIds.length) {
      await sleep(RATE_LIMIT.DELAY_BETWEEN_BATCHES);
    }

  }

  if (failedCount > 0) {
    console.warn(`Warning: ${failedCount} messages failed to fetch`);
  }

  return results;
}

/**
 * Get delta messages for incremental sync
 * Returns new/modified messages and removed message IDs
 */
export async function getDeltaMessages(
  accessToken: string,
  deltaLink?: string
): Promise<{
  messages: OutlookMessage[];
  removedIds: string[];
  newDeltaLink: string;
}> {
  const messages: OutlookMessage[] = [];
  const removedIds: string[] = [];

  let url = deltaLink || `/me/mailFolders('Inbox')/messages/delta?$select=id,conversationId,subject,bodyPreview,receivedDateTime,isRead,from,parentFolderId`;

  while (url) {
    const response: DeltaResponse = await graphRequest(accessToken, url);

    if (response.value) {
      for (const item of response.value) {
        if (item['@removed']) {
          removedIds.push(item.id);
        } else {
          messages.push(item);
        }
      }
    }

    if (response['@odata.nextLink']) {
      url = response['@odata.nextLink'];
    } else {
      return {
        messages,
        removedIds,
        newDeltaLink: response['@odata.deltaLink'] || ''
      };
    }
  }

  return { messages, removedIds, newDeltaLink: '' };
}

/**
 * Initialize delta tracking and get initial delta link
 * Call this after a full sync to establish the baseline
 */
export async function getInitialDeltaLink(accessToken: string): Promise<string> {
  // Request delta with $deltatoken=latest to skip all existing messages
  // and just get the deltaLink for future changes
  const url = `/me/mailFolders('Inbox')/messages/delta?$select=id&$deltatoken=latest`;
  const response = await graphRequest(accessToken, url);
  return response['@odata.deltaLink'] || '';
}

/**
 * Move a message to Deleted Items (trash)
 */
export async function trashMessage(
  accessToken: string,
  messageId: string
): Promise<void> {
  await graphRequest(accessToken, `/me/messages/${messageId}/move`, {
    method: 'POST',
    body: JSON.stringify({
      destinationId: 'deleteditems'
    }),
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
  const CONCURRENT = RATE_LIMIT.MAX_CONCURRENT;

  for (let i = 0; i < messageIds.length; i += CONCURRENT) {
    const batch = messageIds.slice(i, i + CONCURRENT);
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

    if (i + CONCURRENT < messageIds.length) {
      await sleep(RATE_LIMIT.DELAY_BETWEEN_BATCHES);
    }
  }

  return { success, failed };
}

/**
 * Move a message to Archive folder
 */
export async function archiveMessage(
  accessToken: string,
  messageId: string
): Promise<void> {
  await graphRequest(accessToken, `/me/messages/${messageId}/move`, {
    method: 'POST',
    body: JSON.stringify({
      destinationId: 'archive'
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
  const CONCURRENT = RATE_LIMIT.MAX_CONCURRENT;

  for (let i = 0; i < messageIds.length; i += CONCURRENT) {
    const batch = messageIds.slice(i, i + CONCURRENT);
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

    if (i + CONCURRENT < messageIds.length) {
      await sleep(RATE_LIMIT.DELAY_BETWEEN_BATCHES);
    }
  }

  return { success, failed };
}

/**
 * Send an email via Microsoft Graph API
 * Used for mailto-based unsubscribe requests
 */
export async function sendMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  await graphRequest(accessToken, '/me/sendMail', {
    method: 'POST',
    body: JSON.stringify({
      message: {
        subject,
        body: {
          contentType: 'Text',
          content: body
        },
        toRecipients: [{
          emailAddress: { address: to }
        }]
      },
      saveToSentItems: false
    }),
  });
}

/**
 * Extract header value from Outlook message internetMessageHeaders
 */
function getHeader(message: OutlookMessage, headerName: string): string | undefined {
  const header = message.internetMessageHeaders?.find(
    h => h.name.toLowerCase() === headerName.toLowerCase()
  );
  return header?.value;
}

/**
 * Extract unsubscribe link from headers (prefers HTTP)
 */
export function extractUnsubscribeLink(message: OutlookMessage): string | undefined {
  const listUnsubscribe = getHeader(message, 'List-Unsubscribe');
  if (!listUnsubscribe) return undefined;

  // Prefer HTTPS links in angle brackets (RFC 2369 standard)
  const httpMatch = listUnsubscribe.match(/<(https?:\/\/[^>]+)>/);
  if (httpMatch) return httpMatch[1];

  // Fallback: bare URL without angle brackets
  const httpMatchBare = listUnsubscribe.match(/(https?:\/\/\S+)/);
  if (httpMatchBare) return httpMatchBare[1];

  // Mailto in angle brackets
  const mailtoMatch = listUnsubscribe.match(/<(mailto:[^>]+)>/);
  if (mailtoMatch) return mailtoMatch[1];

  // Fallback: bare mailto
  const mailtoBare = listUnsubscribe.match(/(mailto:\S+)/);
  if (mailtoBare) return mailtoBare[1];

  return undefined;
}

/**
 * Extract mailto unsubscribe link from headers
 */
export function extractMailtoUnsubscribeLink(message: OutlookMessage): string | undefined {
  const listUnsubscribe = getHeader(message, 'List-Unsubscribe');
  if (!listUnsubscribe) return undefined;

  const mailtoMatch = listUnsubscribe.match(/<(mailto:[^>]+)>/);
  if (mailtoMatch) return mailtoMatch[1];

  const mailtoBare = listUnsubscribe.match(/(mailto:\S+)/);
  return mailtoBare ? mailtoBare[1] : undefined;
}

/**
 * Create composite key for sender (name + email)
 */
function getSenderKey(email: string, name: string): string {
  return `${name}|||${email}`;
}

/**
 * Aggregate messages by sender to get statistics
 * Same output format as Gmail version, different input format
 */
export function aggregateBySender(messages: OutlookMessage[]): Map<string, SenderStats> {
  const senderMap = new Map<string, SenderStats>();

  let skippedNoFrom = 0;
  for (const message of messages) {
    if (!message.from?.emailAddress?.address) {
      skippedNoFrom++;
      continue;
    }

    const email = message.from.emailAddress.address.toLowerCase();
    const name = message.from.emailAddress.name || email;
    const compositeKey = getSenderKey(email, name);
    const messageDate = new Date(message.receivedDateTime).toISOString();
    const unsubscribeLink = extractUnsubscribeLink(message);
    const mailtoUnsubLink = extractMailtoUnsubscribeLink(message);
    const unsubscribePostHeader = getHeader(message, 'List-Unsubscribe-Post') || '';
    const hasOneClick = unsubscribePostHeader.toLowerCase().includes('list-unsubscribe=one-click');
    const isUnread = !message.isRead;

    // Outlook doesn't have CATEGORY_PROMOTIONS/CATEGORY_UPDATES labels
    // Newsletter detection relies solely on List-Unsubscribe header
    const hasUnsubscribe = !!unsubscribeLink;

    if (!senderMap.has(compositeKey)) {
      senderMap.set(compositeKey, {
        email,
        name,
        count: 0,
        unreadCount: 0,
        firstDate: messageDate,
        lastDate: messageDate,
        unsubscribeLink,
        mailtoUnsubscribeLink: mailtoUnsubLink,
        hasUnsubscribe,
        hasOneClickUnsubscribe: hasOneClick,
        isNewsletter: hasUnsubscribe,
        isPromotional: false,
        messageIds: [],
        _unsubLinkDate: unsubscribeLink ? messageDate : undefined,
        _mailtoUnsubLinkDate: mailtoUnsubLink ? messageDate : undefined,
      });
    }

    const stats = senderMap.get(compositeKey)!;
    stats.count++;
    if (isUnread) stats.unreadCount++;
    stats.messageIds.push(message.id);

    if (messageDate < stats.firstDate) stats.firstDate = messageDate;
    if (messageDate > stats.lastDate) stats.lastDate = messageDate;

    if (unsubscribeLink && (!stats._unsubLinkDate || messageDate > stats._unsubLinkDate)) {
      stats.unsubscribeLink = unsubscribeLink;
      stats.hasUnsubscribe = true;
      stats.hasOneClickUnsubscribe = hasOneClick;
      stats._unsubLinkDate = messageDate;
    }

    if (mailtoUnsubLink && (!stats._mailtoUnsubLinkDate || messageDate > stats._mailtoUnsubLinkDate)) {
      stats.mailtoUnsubscribeLink = mailtoUnsubLink;
      stats._mailtoUnsubLinkDate = messageDate;
    }

    if (hasUnsubscribe) stats.isNewsletter = true;
  }

  return senderMap;
}

/**
 * Extract individual email records from Outlook messages for storage
 * Same output format as Gmail version
 */
export function extractEmailRecords(messages: OutlookMessage[]): EmailRecord[] {
  const records: EmailRecord[] = [];

  for (const message of messages) {
    if (!message.from?.emailAddress?.address) continue;

    const email = message.from.emailAddress.address.toLowerCase();
    const name = message.from.emailAddress.name || email;

    records.push({
      gmail_message_id: message.id, // column name is historical, stores Outlook ID
      sender_email: email,
      sender_name: name,
      subject: message.subject || '(No Subject)',
      snippet: message.bodyPreview || '',
      received_at: new Date(message.receivedDateTime).toISOString(),
      is_unread: !message.isRead,
      thread_id: message.conversationId || message.id,
      labels: [], // Outlook doesn't use labels like Gmail
    });
  }

  return records;
}
