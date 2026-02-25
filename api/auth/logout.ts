import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { extractToken } from '../lib/auth-middleware.js';
import { clearAuthCookies } from '../lib/auth-cookies.js';
import { clearCSRFCookie } from '../lib/csrf.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to identify the user so we can revoke their refresh tokens
    const decoded = extractToken(req);

    if (decoded?.userId) {
      // Revoke all active refresh tokens for this user
      await supabase
        .from('refresh_tokens')
        .update({ revoked: true })
        .eq('user_id', decoded.userId)
        .eq('revoked', false);
    }
  } catch {
    // Even if token extraction fails, we still clear cookies below
  }

  // Always clear cookies, even if token was already expired
  clearAuthCookies(res);
  clearCSRFCookie(res);

  return res.status(200).json({ success: true });
}
