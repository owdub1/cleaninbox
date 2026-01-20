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
 */
async function httpUnsubscribe(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Make a POST request (List-Unsubscribe-Post support)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'CleanInbox/1.0 (Unsubscribe Bot)',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'List-Unsubscribe=One-Click',
      redirect: 'follow',
    });

    // If POST fails, try GET
    if (!response.ok && response.status === 405) {
      const getResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'CleanInbox/1.0 (Unsubscribe Bot)',
        },
        redirect: 'follow',
      });

      if (getResponse.ok || getResponse.status === 200) {
        return { success: true };
      }

      return {
        success: false,
        error: `Unsubscribe request failed with status ${getResponse.status}`
      };
    }

    if (response.ok || response.status === 200) {
      return { success: true };
    }

    return {
      success: false,
      error: `Unsubscribe request failed with status ${response.status}`
    };

  } catch (error: any) {
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

  const { accountEmail, senderEmail, unsubscribeLink } = req.body;

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

    // Get unsubscribe link from cache if not provided
    let linkToUse = unsubscribeLink;

    if (!linkToUse) {
      const { data: senderData } = await supabase
        .from('email_senders')
        .select('unsubscribe_link, sender_name')
        .eq('email_account_id', account.id)
        .eq('sender_email', senderEmail)
        .single();

      if (senderData?.unsubscribe_link) {
        linkToUse = senderData.unsubscribe_link;
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
    const { success, error } = await httpUnsubscribe(linkToUse);

    // Log cleanup action
    await supabase
      .from('cleanup_actions')
      .insert({
        user_id: user.userId,
        email_account_id: account.id,
        action_type: 'unsubscribe',
        sender_email: senderEmail,
        emails_affected: success ? 1 : 0,
        status: success ? 'completed' : 'failed',
        error_message: success ? null : error,
        completed_at: success ? new Date().toISOString() : null
      });

    if (success) {
      // Update user stats
      await supabase
        .from('user_stats')
        .update({
          unsubscribed: supabase.rpc('increment_stat', { amount: 1 }),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.userId);

      // Update email account unsubscribed count
      await supabase
        .from('email_accounts')
        .update({
          unsubscribed: supabase.rpc('increment_stat', { amount: 1 }),
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

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

    // If automatic unsubscribe failed, provide the link for manual action
    return res.status(200).json({
      success: false,
      requiresManualAction: true,
      unsubscribeLink: linkToUse,
      error: error,
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
