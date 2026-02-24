import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from './env.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = requireEnv('JWT_SECRET');

/**
 * Extended request interface with authenticated user data
 */
export interface AuthenticatedRequest extends VercelRequest {
  user?: {
    userId: string;
    email: string;
    emailVerified: boolean;
    role?: string;
  };
}

/**
 * Extract and verify JWT token from Authorization header
 *
 * @param req - Vercel request object
 * @returns Decoded JWT payload or null if invalid
 */
export function extractToken(req: VercelRequest): any {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    // Verify and decode JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Authentication Middleware
 * Requires valid JWT token in Authorization header
 *
 * @example
 * export default async function handler(req: VercelRequest, res: VercelResponse) {
 *   const user = requireAuth(req, res);
 *   if (!user) return; // Request blocked
 *
 *   // User is authenticated, proceed
 *   res.json({ userId: user.userId });
 * }
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: VercelResponse
): { userId: string; email: string; emailVerified: boolean } | null {
  const decoded = extractToken(req);

  if (!decoded || !decoded.userId) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
    return null;
  }

  // Attach user info to request for later use
  req.user = {
    userId: decoded.userId,
    email: decoded.email,
    emailVerified: decoded.emailVerified || false
  };

  return req.user;
}

/**
 * Email Verification Middleware
 * Requires authenticated user with verified email
 *
 * @example
 * export default async function handler(req: VercelRequest, res: VercelResponse) {
 *   const user = requireEmailVerification(req, res);
 *   if (!user) return; // Request blocked
 *
 *   // User has verified email, proceed
 * }
 */
export function requireEmailVerification(
  req: AuthenticatedRequest,
  res: VercelResponse
): { userId: string; email: string; emailVerified: boolean } | null {
  const user = requireAuth(req, res);
  if (!user) return null;

  if (!user.emailVerified) {
    res.status(403).json({
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    });
    return null;
  }

  return user;
}

/**
 * Admin Authorization Middleware
 * Requires authenticated user with admin role
 *
 * @example
 * export default async function handler(req: VercelRequest, res: VercelResponse) {
 *   const admin = await requireAdmin(req, res);
 *   if (!admin) return; // Request blocked
 *
 *   // User is admin, proceed
 * }
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<{ userId: string; email: string; role: string } | null> {
  const user = requireAuth(req, res);
  if (!user) return null;

  // Fetch user role from database
  const { data: userData, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.userId)
    .single();

  if (error || !userData) {
    res.status(403).json({
      error: 'Admin access required',
      code: 'FORBIDDEN'
    });
    return null;
  }

  // Check if user has admin role
  if (userData.role !== 'admin') {
    res.status(403).json({
      error: 'Admin access required',
      code: 'FORBIDDEN'
    });
    return null;
  }

  // Attach role to user object
  req.user!.role = userData.role;

  return req.user as { userId: string; email: string; role: string };
}

/**
 * Moderator or Admin Authorization Middleware
 * Requires authenticated user with moderator or admin role
 */
export async function requireModerator(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<{ userId: string; email: string; role: string } | null> {
  const user = requireAuth(req, res);
  if (!user) return null;

  // Fetch user role from database
  const { data: userData, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.userId)
    .single();

  if (error || !userData) {
    res.status(403).json({
      error: 'Moderator or admin access required',
      code: 'FORBIDDEN'
    });
    return null;
  }

  // Check if user has moderator or admin role
  if (userData.role !== 'moderator' && userData.role !== 'admin') {
    res.status(403).json({
      error: 'Moderator or admin access required',
      code: 'FORBIDDEN'
    });
    return null;
  }

  req.user!.role = userData.role;

  return req.user as { userId: string; email: string; role: string };
}

/**
 * Optional Authentication Middleware
 * Extracts user info if token is present, but doesn't require it
 *
 * @example
 * export default async function handler(req: VercelRequest, res: VercelResponse) {
 *   const user = optionalAuth(req);
 *   if (user) {
 *     // Show personalized content
 *   } else {
 *     // Show public content
 *   }
 * }
 */
export function optionalAuth(
  req: AuthenticatedRequest
): { userId: string; email: string; emailVerified: boolean } | null {
  const decoded = extractToken(req);

  if (!decoded || !decoded.userId) {
    return null;
  }

  req.user = {
    userId: decoded.userId,
    email: decoded.email,
    emailVerified: decoded.emailVerified || false
  };

  return req.user;
}
