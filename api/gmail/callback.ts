/**
 * Gmail OAuth Callback Endpoint
 *
 * GET /api/gmail/callback
 *
 * Handles the OAuth callback from Google, exchanges code for tokens,
 * stores encrypted tokens, and creates/updates email account.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';
import {
  verifyOAuthState,
  exchangeCodeForTokens,
  getGmailProfile,
  storeOAuthTokens
} from '../lib/gmail.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
const limiter = rateLimit(RateLimitPresets.STANDARD);

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

  const { code, state, error: oauthError } = req.query;

  // Handle OAuth errors from Google
  if (oauthError) {
    console.error('Gmail OAuth error:', oauthError);
    return res.redirect(`${APP_URL}/email-cleanup?error=oauth_denied`);
  }

  // Validate required parameters
  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.redirect(`${APP_URL}/email-cleanup?error=invalid_callback`);
  }

  try {
    // Verify state parameter (CSRF protection)
    const stateData = verifyOAuthState(state);
    if (!stateData) {
      return res.redirect(`${APP_URL}/email-cleanup?error=invalid_state`);
    }

    const { userId } = stateData;

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get Gmail profile
    const profile = await getGmailProfile(tokens.access_token);

    // Check if this Gmail account is already connected to another user
    const { data: existingToken } = await supabase
      .from('gmail_oauth_tokens')
      .select('user_id')
      .eq('gmail_email', profile.email)
      .neq('user_id', userId)
      .single();

    if (existingToken) {
      return res.redirect(`${APP_URL}/email-cleanup?error=email_already_connected`);
    }

    // Create or update email account
    const { data: existingAccount } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('email', profile.email)
      .single();

    let emailAccountId: string;

    if (existingAccount) {
      // Update existing account
      await supabase
        .from('email_accounts')
        .update({
          provider: 'Gmail',
          gmail_email: profile.email,
          connection_status: 'connected',
          last_synced: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id);

      emailAccountId = existingAccount.id;
    } else {
      // Create new email account
      const { data: newAccount, error: insertError } = await supabase
        .from('email_accounts')
        .insert({
          user_id: userId,
          email: profile.email,
          provider: 'Gmail',
          gmail_email: profile.email,
          connection_status: 'connected',
          last_synced: new Date().toISOString(),
          total_emails: 0,
          processed_emails: 0,
          unsubscribed: 0
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create email account: ${insertError.message}`);
      }

      emailAccountId = newAccount.id;
    }

    // Store encrypted OAuth tokens
    const { id: tokenId } = await storeOAuthTokens(
      userId,
      emailAccountId,
      profile.email,
      tokens
    );

    // Update email account with token reference
    await supabase
      .from('email_accounts')
      .update({ oauth_token_id: tokenId })
      .eq('id', emailAccountId);

    // Log to activity_log for Recent Activity display
    await supabase
      .from('activity_log')
      .insert({
        user_id: userId,
        action_type: 'account_connect',
        description: `Connected Gmail account ${profile.email}`,
        metadata: { email: profile.email, provider: 'Gmail' }
      });

    // Redirect back to app with success
    return res.redirect(`${APP_URL}/email-cleanup?connected=true&email=${encodeURIComponent(profile.email)}`);

  } catch (error: any) {
    console.error('Gmail callback error:', error);
    return res.redirect(`${APP_URL}/email-cleanup?error=callback_failed`);
  }
}
