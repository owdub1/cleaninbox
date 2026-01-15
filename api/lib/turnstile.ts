import type { VercelRequest } from '@vercel/node';

/**
 * Cloudflare Turnstile CAPTCHA Verification
 *
 * Free, privacy-friendly CAPTCHA alternative to reCAPTCHA
 * Get your keys at: https://dash.cloudflare.com/
 *
 * Setup:
 * 1. Go to https://dash.cloudflare.com/
 * 2. Select your account > Turnstile
 * 3. Create a new site key
 * 4. Add TURNSTILE_SECRET_KEY to .env
 */

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify Turnstile token from client
 *
 * @param token - The token from cf-turnstile-response
 * @param req - Vercel request (for IP address)
 * @returns Promise<boolean> - True if verification passed
 */
export async function verifyTurnstile(token: string, req?: VercelRequest): Promise<boolean> {
  // If no secret key is configured, allow through (development mode)
  if (!TURNSTILE_SECRET_KEY) {
    console.warn('TURNSTILE_SECRET_KEY not configured - CAPTCHA verification bypassed');
    return true;
  }

  if (!token) {
    console.error('Turnstile: No token provided');
    return false;
  }

  try {
    // Get user's IP address for verification
    const remoteip = req?.headers['x-forwarded-for'] as string ||
                     req?.headers['x-real-ip'] as string ||
                     req?.socket?.remoteAddress;

    // Verify with Cloudflare
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: remoteip
      }),
    });

    const data: TurnstileVerifyResponse = await response.json() as any;

    if (!data.success) {
      console.error('Turnstile verification failed:', data['error-codes']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

/**
 * Middleware wrapper for Turnstile verification
 *
 * @example
 * if (!await turnstileProtection(req, 'captchaToken')) {
 *   return res.status(400).json({ error: 'CAPTCHA verification failed' });
 * }
 */
export async function turnstileProtection(
  req: VercelRequest,
  tokenField: string = 'captchaToken'
): Promise<boolean> {
  const token = req.body?.[tokenField];
  return await verifyTurnstile(token, req);
}
