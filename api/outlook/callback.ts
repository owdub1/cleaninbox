/**
 * Outlook OAuth Callback Endpoint
 *
 * GET /api/outlook/callback
 *
 * Handles the OAuth callback from Microsoft, exchanges code for tokens,
 * stores encrypted tokens, and creates/updates email account.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';
import {
  verifyOutlookOAuthState,
  exchangeOutlookCodeForTokens,
  getOutlookProfile,
  storeOutlookOAuthTokens
} from '../lib/outlook.js';
import { PLAN_LIMITS } from '../subscription/get.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.VITE_APP_URL || '';
const limiter = rateLimit(RateLimitPresets.STANDARD);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (await limiter(req, res)) return;

  const { code, state, error: oauthError, error_description } = req.query;

  // Handle OAuth errors from Microsoft
  if (oauthError) {
    console.error('Outlook OAuth error:', oauthError, error_description);
    return res.redirect(`${APP_URL}/email-cleanup?error=oauth_denied`);
  }

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.redirect(`${APP_URL}/email-cleanup?error=invalid_callback`);
  }

  try {
    // Verify state parameter (CSRF protection)
    const stateData = verifyOutlookOAuthState(state);
    if (!stateData) {
      console.error('Invalid OAuth state');
      return res.redirect(`${APP_URL}/email-cleanup?error=invalid_state`);
    }

    const { userId } = stateData;
    console.log('Outlook callback for user:', userId);

    // Exchange authorization code for tokens
    const tokens = await exchangeOutlookCodeForTokens(code);
    console.log('Got tokens, expires_in:', tokens.expires_in);

    // Get Outlook profile
    const profile = await getOutlookProfile(tokens.access_token);
    console.log('Outlook profile:', profile.email);

    // Check if this Outlook account is already connected to another user
    const { data: existingToken } = await supabase
      .from('outlook_oauth_tokens')
      .select('user_id')
      .eq('outlook_email', profile.email)
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

    if (!existingAccount) {
      // Check plan limits before creating a new account
      const { count: accountCount } = await supabase
        .from('email_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { data: userData } = await supabase
        .from('users')
        .select('subscription')
        .eq('id', userId)
        .single();

      const planKey = (userData?.subscription?.toLowerCase() || 'free') as keyof typeof PLAN_LIMITS;
      const limit = (PLAN_LIMITS[planKey] || PLAN_LIMITS.free).emailLimit;

      if ((accountCount || 0) >= limit) {
        return res.redirect(`${APP_URL}/email-cleanup?error=account_limit_reached`);
      }
    }

    let emailAccountId: string;

    if (existingAccount) {
      await supabase
        .from('email_accounts')
        .update({
          provider: 'Outlook',
          connection_status: 'connected',
          last_synced: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id);

      emailAccountId = existingAccount.id;
    } else {
      const { data: newAccount, error: insertError } = await supabase
        .from('email_accounts')
        .insert({
          user_id: userId,
          email: profile.email,
          provider: 'Outlook',
          connection_status: 'connected',
          last_synced: null,
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
    console.log('Storing tokens for:', { userId, emailAccountId, email: profile.email });
    const { id: tokenId } = await storeOutlookOAuthTokens(
      userId,
      emailAccountId,
      profile.email,
      tokens
    );
    console.log('Tokens stored with ID:', tokenId);

    // Update email account with token reference
    const { error: updateError } = await supabase
      .from('email_accounts')
      .update({ oauth_token_id: tokenId })
      .eq('id', emailAccountId);

    if (updateError) {
      console.error('Failed to update email account:', updateError);
    }

    // Log to activity_log
    await supabase
      .from('activity_log')
      .insert({
        user_id: userId,
        action_type: 'account_connect',
        description: `Connected Outlook account ${profile.email}`,
        metadata: { email: profile.email, provider: 'Outlook' }
      });

    // Redirect back to app with success
    return res.redirect(`${APP_URL}/email-cleanup?connected=true&email=${encodeURIComponent(profile.email)}`);

  } catch (error: any) {
    console.error('Outlook callback error:', error);
    return res.redirect(`${APP_URL}/email-cleanup?error=callback_failed&reason=${encodeURIComponent(error.message || 'unknown')}`);
  }
}
