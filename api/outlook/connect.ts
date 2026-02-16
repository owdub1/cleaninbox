/**
 * Outlook OAuth Connect Endpoint
 *
 * GET /api/outlook/connect
 *
 * Initiates Outlook OAuth flow by returning the Microsoft authorization URL.
 * Requires authenticated user.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';
import { generateOutlookOAuthState, getOutlookAuthUrl } from '../lib/outlook.js';

const limiter = rateLimit(RateLimitPresets.STANDARD);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (limiter(req, res)) return;

  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  try {
    const state = generateOutlookOAuthState(user.userId);
    const authUrl = getOutlookAuthUrl(state);

    return res.status(200).json({
      authUrl,
      message: 'Redirect user to authUrl to start Outlook OAuth flow'
    });
  } catch (error: any) {
    console.error('Outlook connect error:', error);

    if (error.message.includes('not configured')) {
      return res.status(500).json({
        error: 'Outlook OAuth is not configured',
        code: 'OUTLOOK_NOT_CONFIGURED',
        debug: {
          hasClientId: !!process.env.OUTLOOK_CLIENT_ID,
          hasClientSecret: !!process.env.OUTLOOK_CLIENT_SECRET,
          hasEncryptionKey: !!process.env.OUTLOOK_TOKEN_ENCRYPTION_KEY,
          hasApiUrl: !!process.env.API_URL,
          errorMessage: error.message
        }
      });
    }

    return res.status(500).json({
      error: 'Failed to generate Outlook authorization URL',
      code: 'OUTLOOK_CONNECT_ERROR'
    });
  }
}
