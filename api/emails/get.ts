/**
 * Get Single Email Endpoint
 *
 * GET /api/emails/get?messageId=xxx&accountEmail=xxx
 *
 * Returns the full content of a single email.
 * Requires authenticated user with connected Gmail account.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';
import { getValidAccessToken } from '../lib/gmail.js';
import { getMessage } from '../lib/gmail-api.js';

const limiter = rateLimit(RateLimitPresets.RELAXED);

export interface FullEmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  bodyHtml: string;
  isUnread: boolean;
  labels: string[];
}

/**
 * Decode base64url encoded string
 */
function decodeBase64Url(data: string): string {
  // Replace URL-safe characters
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (e) {
    console.warn('Failed to decode base64:', e);
    return '';
  }
}

/**
 * Extract body from message payload
 */
function extractBody(payload: any): { text: string; html: string } {
  let text = '';
  let html = '';

  if (!payload) {
    return { text, html };
  }

  // Simple message with body directly in payload
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    const mimeType = payload.mimeType || '';
    if (mimeType.includes('html')) {
      html = decoded;
    } else {
      text = decoded;
    }
  }

  // Multipart message - recursively search parts
  if (payload.parts) {
    for (const part of payload.parts) {
      const mimeType = part.mimeType || '';

      if (part.body?.data) {
        const decoded = decodeBase64Url(part.body.data);
        if (mimeType === 'text/html') {
          html = decoded;
        } else if (mimeType === 'text/plain') {
          text = decoded;
        }
      }

      // Handle nested parts (e.g., multipart/alternative inside multipart/mixed)
      if (part.parts) {
        const nested = extractBody(part);
        if (nested.html && !html) html = nested.html;
        if (nested.text && !text) text = nested.text;
      }
    }
  }

  return { text, html };
}

/**
 * Extract header value from message
 */
function getHeader(payload: any, headerName: string): string {
  if (!payload?.headers) return '';
  const header = payload.headers.find(
    (h: any) => h.name.toLowerCase() === headerName.toLowerCase()
  );
  return header?.value || '';
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  if (limiter(req, res)) return;

  // Require authentication
  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  const { messageId, accountEmail } = req.query;

  if (!messageId || typeof messageId !== 'string') {
    return res.status(400).json({ error: 'messageId is required' });
  }

  if (!accountEmail || typeof accountEmail !== 'string') {
    return res.status(400).json({ error: 'accountEmail is required' });
  }

  try {
    // Get valid access token
    const { accessToken } = await getValidAccessToken(user.userId, accountEmail);

    // Fetch the full message
    const message = await getMessage(accessToken, messageId, 'full');

    // Extract headers
    const subject = getHeader(message.payload, 'Subject') || '(No Subject)';
    const from = getHeader(message.payload, 'From') || '';
    const to = getHeader(message.payload, 'To') || '';
    const date = message.internalDate
      ? new Date(parseInt(message.internalDate)).toISOString()
      : '';

    // Extract body content
    const { text, html } = extractBody(message.payload);

    const email: FullEmailMessage = {
      id: message.id,
      threadId: message.threadId,
      subject,
      from,
      to,
      date,
      snippet: message.snippet || '',
      body: text,
      bodyHtml: html,
      isUnread: message.labelIds?.includes('UNREAD') || false,
      labels: message.labelIds || [],
    };

    return res.status(200).json({ email });

  } catch (error: any) {
    console.error('Fetch email error:', error);
    return res.status(500).json({
      error: 'Failed to fetch email',
      message: error.message
    });
  }
}
