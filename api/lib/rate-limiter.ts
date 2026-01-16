import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getClientIP } from './auth-utils.js';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
  keyGenerator?: (req: VercelRequest) => string; // Custom key generator (default: IP address)
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// Note: In production with multiple serverless instances, use Redis/Upstash
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Rate limiting middleware for API routes
 *
 * @example
 * // Limit to 5 requests per minute
 * const limiter = rateLimit({ windowMs: 60 * 1000, maxRequests: 5 });
 * if (limiter(req, res)) return; // Request blocked
 *
 * @example
 * // Custom key generator (by user email instead of IP)
 * const limiter = rateLimit({
 *   windowMs: 60 * 60 * 1000, // 1 hour
 *   maxRequests: 3,
 *   keyGenerator: (req) => req.body.email || getClientIP(req)
 * });
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    keyGenerator = getClientIP
  } = config;

  return function rateLimitMiddleware(req: VercelRequest, res: VercelResponse): boolean {
    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, entry);
    }

    // Increment request count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      const resetIn = Math.ceil((entry.resetTime - now) / 1000); // seconds
      res.status(429).json({
        error: message,
        retryAfter: resetIn,
        limit: maxRequests,
        windowMs: windowMs / 1000
      });
      return true; // Request blocked
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    return false; // Request allowed
  };
}

/**
 * Common rate limit configurations
 */
export const RateLimitPresets = {
  // Strict: 10 requests per minute
  STRICT: { windowMs: 60 * 1000, maxRequests: 10 },

  // Standard: 30 requests per minute
  STANDARD: { windowMs: 60 * 1000, maxRequests: 30 },

  // Relaxed: 100 requests per minute
  RELAXED: { windowMs: 60 * 1000, maxRequests: 100 },

  // Auth endpoints: 5 attempts per 15 minutes
  AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 5 },

  // Password reset: 10 requests per hour (increased for testing)
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    message: 'Too many password reset requests. Please try again later.'
  },

  // Email verification: 5 requests per hour
  EMAIL_VERIFICATION: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many verification emails sent. Please try again later.'
  },

  // Signup: 3 signups per hour per IP
  SIGNUP: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    message: 'Too many signup attempts. Please try again later.'
  }
};

/**
 * Get current rate limit status for a key
 */
export function getRateLimitStatus(key: string): RateLimitEntry | null {
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetTime < Date.now()) {
    return null;
  }
  return entry;
}

/**
 * Reset rate limit for a specific key (useful for testing or admin actions)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limit entries (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
