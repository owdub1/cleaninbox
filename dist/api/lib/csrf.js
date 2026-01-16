import crypto from 'crypto';
/**
 * CSRF Protection Utilities
 *
 * Implements double-submit cookie pattern for CSRF protection
 * in a serverless environment.
 */
const CSRF_TOKEN_LENGTH = 32; // 32 bytes = 256 bits
/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken() {
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}
/**
 * Verify CSRF token from request
 * Checks both cookie and header/body for matching tokens
 */
export function verifyCSRFToken(req) {
    // Get token from header (primary method)
    const headerToken = req.headers['x-csrf-token'];
    // Get token from body (fallback for form submissions)
    const bodyToken = req.body?._csrf;
    // Get token from cookie
    const cookieToken = req.cookies?.['csrf-token'];
    // Token must be present in both cookie and (header OR body)
    if (!cookieToken) {
        console.warn('CSRF: No cookie token found');
        return false;
    }
    const requestToken = headerToken || bodyToken;
    if (!requestToken) {
        console.warn('CSRF: No request token found in header or body');
        return false;
    }
    // Tokens must match using constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(requestToken));
}
/**
 * CSRF Protection Middleware
 *
 * Call this at the start of any handler that performs state-changing operations
 * (POST, PUT, DELETE, PATCH)
 *
 * @example
 * export default async function handler(req: VercelRequest, res: VercelResponse) {
 *   if (req.method === 'POST') {
 *     if (!csrfProtection(req, res)) return; // Blocked by CSRF check
 *   }
 *   // ... rest of handler
 * }
 */
export function csrfProtection(req, res) {
    // Only check CSRF on state-changing methods
    const stateMutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (!stateMutatingMethods.includes(req.method || '')) {
        return true; // Allow read-only operations
    }
    // Verify CSRF token
    if (!verifyCSRFToken(req)) {
        res.status(403).json({
            error: 'CSRF token validation failed',
            code: 'CSRF_TOKEN_INVALID'
        });
        return false; // Request blocked
    }
    return true; // Request allowed
}
/**
 * Set CSRF token cookie in response
 *
 * @param res - Vercel response object
 * @param token - CSRF token to set
 * @param maxAge - Cookie max age in seconds (default: 7 days)
 */
export function setCSRFCookie(res, token, maxAge = 7 * 24 * 60 * 60 // 7 days
) {
    // Set cookie with security flags
    const cookieValue = `csrf-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/`;
    res.setHeader('Set-Cookie', cookieValue);
}
/**
 * Generate CSRF token and set cookie
 * Use this when creating a new session (login/signup)
 */
export function issueCSRFToken(res) {
    const token = generateCSRFToken();
    setCSRFCookie(res, token);
    return token;
}
/**
 * Clear CSRF cookie (use on logout)
 */
export function clearCSRFCookie(res) {
    res.setHeader('Set-Cookie', 'csrf-token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/');
}
