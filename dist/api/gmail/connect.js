/**
 * Gmail OAuth Connect Endpoint
 *
 * GET /api/gmail/connect
 *
 * Initiates Gmail OAuth flow by returning the Google authorization URL.
 * Requires authenticated user.
 */
import { requireAuth } from '../lib/auth-middleware.js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';
import { generateOAuthState, getGmailAuthUrl } from '../lib/gmail.js';
const limiter = rateLimit(RateLimitPresets.STANDARD);
export default async function handler(req, res) {
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    // Rate limiting
    if (limiter(req, res))
        return;
    // Require authentication
    const user = requireAuth(req, res);
    if (!user)
        return;
    try {
        // Generate state parameter with user ID for CSRF protection
        const state = generateOAuthState(user.userId);
        // Get Gmail OAuth URL
        const authUrl = getGmailAuthUrl(state);
        return res.status(200).json({
            authUrl,
            message: 'Redirect user to authUrl to start Gmail OAuth flow'
        });
    }
    catch (error) {
        console.error('Gmail connect error:', error);
        // Check for configuration errors
        if (error.message.includes('not configured')) {
            return res.status(500).json({
                error: 'Gmail OAuth is not configured',
                code: 'GMAIL_NOT_CONFIGURED'
            });
        }
        return res.status(500).json({
            error: 'Failed to generate Gmail authorization URL',
            code: 'GMAIL_CONNECT_ERROR'
        });
    }
}
