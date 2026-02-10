/**
 * Unsubscribe Endpoint
 *
 * POST /api/cleanup/unsubscribe
 *
 * Attempts to unsubscribe from a sender using the List-Unsubscribe header.
 * Supports both HTTP and mailto unsubscribe methods.
 * Requires authenticated user.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit } from '../lib/rate-limiter.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limit: 20 unsubscribe actions per minute
const limiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Too many unsubscribe requests. Please wait before trying again.'
});

/**
 * Attempt HTTP unsubscribe
 * @param url - The unsubscribe URL
 * @param supportsOneClick - Whether the sender supports RFC 8058 One-Click unsubscribe
 */
async function httpUnsubscribe(
  url: string,
  supportsOneClick: boolean
): Promise<{ success: boolean; requiresManualAction?: boolean; linkExpired?: boolean; error?: string }> {
  try {
    if (supportsOneClick) {
      // RFC 8058 One-Click: POST with List-Unsubscribe=One-Click body
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': 'CleanInbox/1.0 (Unsubscribe Bot)',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'List-Unsubscribe=One-Click',
        redirect: 'follow',
      });

      if (response.ok) {
        return { success: true };
      }

      // Expired/dead link detection
      if (response.status === 404 || response.status === 410) {
        return { success: false, linkExpired: true, error: 'This unsubscribe link has expired or is no longer valid.' };
      }

      return {
        success: false,
        error: `Unsubscribe request failed with status ${response.status}`
      };
    } else {
      // No One-Click support: the link needs to be opened in a browser for the user to complete manually
      return { success: false, requiresManualAction: true };
    }
  } catch (error: any) {
    // DNS failure or network error - likely a dead/expired link
    if (error.cause?.code === 'ENOTFOUND' || error.message?.includes('ENOTFOUND')) {
      return { success: false, linkExpired: true, error: 'This unsubscribe link is no longer valid (domain not found).' };
    }
    return {
      success: false,
      error: error.message || 'Failed to reach unsubscribe URL'
    };
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  if (limiter(req, res)) return;

  // Require authentication
  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  const { accountEmail, senderEmail, unsubscribeLink, hasOneClickUnsubscribe } = req.body;

  // Validate input
  if (!accountEmail) {
    return res.status(400).json({
      error: 'Account email is required',
      code: 'MISSING_ACCOUNT_EMAIL'
    });
  }

  if (!senderEmail) {
    return res.status(400).json({
      error: 'Sender email is required',
      code: 'MISSING_SENDER_EMAIL'
    });
  }

  try {
    // Get email account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.userId)
      .eq('email', accountEmail)
      .single();

    if (accountError || !account) {
      return res.status(404).json({
        error: 'Email account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    // Get unsubscribe link and one-click flag from cache if not provided
    let linkToUse = unsubscribeLink;
    let supportsOneClick = hasOneClickUnsubscribe ?? false;

    if (!linkToUse || hasOneClickUnsubscribe === undefined) {
      const { data: senderData } = await supabase
        .from('email_senders')
        .select('unsubscribe_link, sender_name, has_one_click_unsubscribe')
        .eq('email_account_id', account.id)
        .eq('sender_email', senderEmail)
        .single();

      if (senderData?.unsubscribe_link && !linkToUse) {
        linkToUse = senderData.unsubscribe_link;
      }
      if (hasOneClickUnsubscribe === undefined && senderData) {
        supportsOneClick = senderData.has_one_click_unsubscribe ?? false;
      }
    }

    if (!linkToUse) {
      return res.status(400).json({
        error: 'No unsubscribe link available for this sender',
        code: 'NO_UNSUBSCRIBE_LINK'
      });
    }

    // Handle mailto: links
    if (linkToUse.startsWith('mailto:')) {
      // We can't send emails directly, return the mailto link for manual action
      await supabase
        .from('cleanup_actions')
        .insert({
          user_id: user.userId,
          email_account_id: account.id,
          action_type: 'unsubscribe',
          sender_email: senderEmail,
          emails_affected: 0,
          status: 'pending',
          error_message: 'Manual email unsubscribe required'
        });

      return res.status(200).json({
        success: false,
        requiresManualAction: true,
        unsubscribeLink: linkToUse,
        message: 'This sender requires email-based unsubscribe. Please click the link to send an unsubscribe email.'
      });
    }

    // Attempt HTTP unsubscribe
    const result = await httpUnsubscribe(linkToUse, supportsOneClick);

    // Handle expired links
    if (result.linkExpired) {
      await supabase
        .from('cleanup_actions')
        .insert({
          user_id: user.userId,
          email_account_id: account.id,
          action_type: 'unsubscribe',
          sender_email: senderEmail,
          emails_affected: 0,
          status: 'failed',
          error_message: result.error || 'Link expired'
        });

      return res.status(200).json({
        success: false,
        linkExpired: true,
        error: result.error,
        message: result.error || 'This unsubscribe link has expired.'
      });
    }

    // Handle manual action required (no One-Click support)
    if (result.requiresManualAction) {
      await supabase
        .from('cleanup_actions')
        .insert({
          user_id: user.userId,
          email_account_id: account.id,
          action_type: 'unsubscribe',
          sender_email: senderEmail,
          emails_affected: 0,
          status: 'pending',
          error_message: 'Manual unsubscribe required (no One-Click support)'
        });

      return res.status(200).json({
        success: false,
        requiresManualAction: true,
        unsubscribeLink: linkToUse,
        message: 'This sender doesn\'t support automatic unsubscribe. Opening the unsubscribe page for you to complete manually.'
      });
    }

    // Log cleanup action
    await supabase
      .from('cleanup_actions')
      .insert({
        user_id: user.userId,
        email_account_id: account.id,
        action_type: 'unsubscribe',
        sender_email: senderEmail,
        emails_affected: result.success ? 1 : 0,
        status: result.success ? 'completed' : 'failed',
        error_message: result.success ? null : result.error,
        completed_at: result.success ? new Date().toISOString() : null
      });

    if (result.success) {
      // Update user stats (fetch current, then increment)
      const { data: currentStats } = await supabase
        .from('user_stats')
        .select('unsubscribed')
        .eq('user_id', user.userId)
        .single();

      if (currentStats) {
        await supabase
          .from('user_stats')
          .update({
            unsubscribed: (currentStats.unsubscribed || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.userId);
      }

      // Update email account unsubscribed count
      const { data: currentAccount } = await supabase
        .from('email_accounts')
        .select('unsubscribed')
        .eq('id', account.id)
        .single();

      if (currentAccount) {
        await supabase
          .from('email_accounts')
          .update({
            unsubscribed: (currentAccount.unsubscribed || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id);
      }

      // Log to activity_log for Recent Activity display
      await supabase
        .from('activity_log')
        .insert({
          user_id: user.userId,
          action_type: 'unsubscribe',
          description: `Unsubscribed from ${senderEmail}`,
          metadata: { senderEmail }
        });

      return res.status(200).json({
        success: true,
        message: `Successfully unsubscribed from ${senderEmail}`
      });
    }

    // If automatic unsubscribe failed for other reasons, provide the link for manual action
    return res.status(200).json({
      success: false,
      requiresManualAction: true,
      unsubscribeLink: linkToUse,
      error: result.error,
      message: 'Automatic unsubscribe failed. Please try the unsubscribe link manually.'
    });

  } catch (error: any) {
    console.error('Unsubscribe error:', error);
    return res.status(500).json({
      error: 'Failed to unsubscribe',
      code: 'UNSUBSCRIBE_ERROR'
    });
  }
}
