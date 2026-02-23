import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../lib/auth-middleware.js';
import { rateLimit, RateLimitPresets } from '../lib/rate-limiter.js';
import { hashPassword, comparePassword, validatePassword } from '../lib/auth-utils.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

const limiter = rateLimit(RateLimitPresets.STANDARD);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (await limiter(req, res)) return;

  const user = requireAuth(req as AuthenticatedRequest, res);
  if (!user) return;

  try {
    const { firstName, lastName, currentPassword, newPassword } = req.body || {};

    // Validate that at least something is being updated
    const hasNameUpdate = firstName !== undefined || lastName !== undefined;
    const hasPasswordUpdate = currentPassword && newPassword;

    if (!hasNameUpdate && !hasPasswordUpdate) {
      return res.status(400).json({
        error: 'No changes provided',
        code: 'NO_CHANGES'
      });
    }

    // Handle password change
    if (hasPasswordUpdate) {
      // Fetch current password hash
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', user.userId)
        .single();

      if (fetchError || !userData) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Verify current password
      const passwordValid = await comparePassword(currentPassword, userData.password_hash);
      if (!passwordValid) {
        return res.status(401).json({
          error: 'Current password is incorrect',
          code: 'INVALID_PASSWORD'
        });
      }

      // Validate new password strength
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.errors[0],
          code: 'WEAK_PASSWORD'
        });
      }

      // Hash and update password
      const newHash = await hashPassword(newPassword);
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: newHash,
          last_password_change_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.userId);

      if (updateError) {
        console.error('Password update error:', updateError);
        return res.status(500).json({
          error: 'Failed to update password',
          code: 'UPDATE_ERROR'
        });
      }

      // Revoke all refresh tokens
      await supabase.rpc('revoke_user_refresh_tokens', { p_user_id: user.userId });
    }

    // Handle name update
    if (hasNameUpdate) {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      if (firstName !== undefined) updates.first_name = firstName.trim();
      if (lastName !== undefined) updates.last_name = lastName.trim();

      const { error: nameError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.userId);

      if (nameError) {
        console.error('Name update error:', nameError);
        return res.status(500).json({
          error: 'Failed to update profile',
          code: 'UPDATE_ERROR'
        });
      }
    }

    // Fetch updated user data
    const { data: updatedUser, error: refetchError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, email_verified')
      .eq('id', user.userId)
      .single();

    if (refetchError || !updatedUser) {
      return res.status(500).json({
        error: 'Failed to fetch updated user',
        code: 'FETCH_ERROR'
      });
    }

    // Generate new JWT token (always, so user data in token stays fresh)
    const newToken = jwt.sign(
      {
        userId: updatedUser.id,
        email: updatedUser.email,
        emailVerified: updatedUser.email_verified
      },
      JWT_SECRET
    );

    return res.status(200).json({
      success: true,
      token: newToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        emailVerified: updatedUser.email_verified
      }
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      error: 'Failed to update profile',
      code: 'INTERNAL_ERROR'
    });
  }
}
