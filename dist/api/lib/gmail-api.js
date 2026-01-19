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
/**
 * Make authenticated request to Gmail API
 */
async function gmailRequest(accessToken, endpoint, options = {}) {
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
        throw new Error(`Gmail API error: ${response.status} - ${error}`);
    }
    // Handle empty responses (like successful deletes)
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}
/**
 * List messages from Gmail inbox
 */
export async function listMessages(accessToken, options = {}) {
    const params = new URLSearchParams();
    if (options.maxResults)
        params.set('maxResults', options.maxResults.toString());
    if (options.pageToken)
        params.set('pageToken', options.pageToken);
    if (options.q)
        params.set('q', options.q);
    if (options.labelIds)
        params.set('labelIds', options.labelIds.join(','));
    const queryString = params.toString();
    const endpoint = `/messages${queryString ? `?${queryString}` : ''}`;
    return gmailRequest(accessToken, endpoint);
}
/**
 * Get full message details
 */
export async function getMessage(accessToken, messageId, format = 'metadata') {
    const metadataHeaders = 'From,Subject,List-Unsubscribe,List-Unsubscribe-Post';
    return gmailRequest(accessToken, `/messages/${messageId}?format=${format}&metadataHeaders=${metadataHeaders}`);
}
/**
 * Batch get multiple messages
 */
export async function batchGetMessages(accessToken, messageIds, format = 'metadata') {
    // Gmail batch API is complex, so we'll do parallel requests with limit
    const BATCH_SIZE = 50;
    const results = [];
    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
        const batch = messageIds.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(id => getMessage(accessToken, id, format).catch(() => null)));
        results.push(...batchResults.filter(Boolean));
    }
    return results;
}
/**
 * Delete a message (move to trash)
 */
export async function trashMessage(accessToken, messageId) {
    await gmailRequest(accessToken, `/messages/${messageId}/trash`, {
        method: 'POST',
    });
}
/**
 * Permanently delete a message
 */
export async function deleteMessage(accessToken, messageId) {
    await gmailRequest(accessToken, `/messages/${messageId}`, {
        method: 'DELETE',
    });
}
/**
 * Batch trash messages
 */
export async function batchTrashMessages(accessToken, messageIds) {
    const success = [];
    const failed = [];
    // Process in parallel batches
    const BATCH_SIZE = 25;
    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
        const batch = messageIds.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(id => trashMessage(accessToken, id)));
        results.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
                success.push(batch[idx]);
            }
            else {
                failed.push(batch[idx]);
            }
        });
    }
    return { success, failed };
}
/**
 * Archive a message (remove INBOX label)
 */
export async function archiveMessage(accessToken, messageId) {
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
export async function batchArchiveMessages(accessToken, messageIds) {
    const success = [];
    const failed = [];
    const BATCH_SIZE = 25;
    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
        const batch = messageIds.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(id => archiveMessage(accessToken, id)));
        results.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
                success.push(batch[idx]);
            }
            else {
                failed.push(batch[idx]);
            }
        });
    }
    return { success, failed };
}
/**
 * Extract header value from message
 */
function getHeader(message, headerName) {
    const header = message.payload?.headers?.find(h => h.name.toLowerCase() === headerName.toLowerCase());
    return header?.value;
}
/**
 * Parse sender from From header
 */
function parseSender(fromHeader) {
    // Handle formats like:
    // "John Doe <john@example.com>"
    // "john@example.com"
    // "<john@example.com>"
    const match = fromHeader.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+@[^>]+)>?$/);
    if (match) {
        return {
            name: (match[1] || '').trim(),
            email: match[2].toLowerCase().trim(),
        };
    }
    return {
        name: '',
        email: fromHeader.toLowerCase().trim(),
    };
}
/**
 * Extract unsubscribe link from headers
 */
function extractUnsubscribeLink(message) {
    const listUnsubscribe = getHeader(message, 'List-Unsubscribe');
    if (!listUnsubscribe)
        return undefined;
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
function isPromotional(message) {
    return message.labelIds?.includes('CATEGORY_PROMOTIONS') || false;
}
/**
 * Check if message is likely a newsletter
 */
function isNewsletter(message) {
    const listUnsubscribe = getHeader(message, 'List-Unsubscribe');
    const hasPromotions = message.labelIds?.includes('CATEGORY_PROMOTIONS');
    const hasUpdates = message.labelIds?.includes('CATEGORY_UPDATES');
    return !!(listUnsubscribe && (hasPromotions || hasUpdates));
}
/**
 * Aggregate messages by sender to get statistics
 */
export function aggregateBySender(messages) {
    const senderMap = new Map();
    for (const message of messages) {
        const fromHeader = getHeader(message, 'From');
        if (!fromHeader)
            continue;
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
        const stats = senderMap.get(email);
        stats.count++;
        if (isUnread)
            stats.unreadCount++;
        stats.messageIds.push(message.id);
        // Update date range
        if (messageDate < stats.firstDate)
            stats.firstDate = messageDate;
        if (messageDate > stats.lastDate)
            stats.lastDate = messageDate;
        // Update unsubscribe link if we found one
        if (unsubscribeLink && !stats.unsubscribeLink) {
            stats.unsubscribeLink = unsubscribeLink;
            stats.hasUnsubscribe = true;
        }
        // Update newsletter/promotional flags
        if (isNewsletter(message))
            stats.isNewsletter = true;
        if (isPromotional(message))
            stats.isPromotional = true;
    }
    return senderMap;
}
/**
 * List all messages from a specific sender
 */
export async function listMessagesBySender(accessToken, senderEmail, maxResults = 500) {
    const messageIds = [];
    let pageToken;
    while (messageIds.length < maxResults) {
        const response = await listMessages(accessToken, {
            maxResults: Math.min(100, maxResults - messageIds.length),
            pageToken,
            q: `from:${senderEmail}`,
        });
        if (!response.messages || response.messages.length === 0)
            break;
        messageIds.push(...response.messages.map(m => m.id));
        if (!response.nextPageToken)
            break;
        pageToken = response.nextPageToken;
    }
    return messageIds;
}
/**
 * Delete all emails from a specific sender
 */
export async function deleteEmailsFromSender(accessToken, senderEmail) {
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
export async function archiveEmailsFromSender(accessToken, senderEmail) {
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
export async function fetchSenderStats(accessToken, maxMessages = 1000) {
    // Fetch message list
    const allMessageRefs = [];
    let pageToken;
    while (allMessageRefs.length < maxMessages) {
        const response = await listMessages(accessToken, {
            maxResults: Math.min(100, maxMessages - allMessageRefs.length),
            pageToken,
        });
        if (!response.messages || response.messages.length === 0)
            break;
        allMessageRefs.push(...response.messages);
        if (!response.nextPageToken)
            break;
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
