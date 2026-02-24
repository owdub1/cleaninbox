import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getClientIP } from './auth-utils.js';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
  keyGenerator?: (req: VercelRequest) => string; // Custom key generator (default: IP address)
}

// Lazily-initialized Redis client (null if env vars missing → local dev fallback)
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// Cache of Ratelimit instances keyed by "windowMs:maxRequests"
const limiters = new Map<string, Ratelimit>();

function getLimiter(windowMs: number, maxRequests: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  const cacheKey = `${windowMs}:${maxRequests}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
      prefix: `rl:${cacheKey}`,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Rate limiting middleware for API routes
 *
 * @example
 * // Limit to 5 requests per minute
 * const limiter = rateLimit({ windowMs: 60 * 1000, maxRequests: 5 });
 * if (await limiter(req, res)) return; // Request blocked
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

  return async function rateLimitMiddleware(req: VercelRequest, res: VercelResponse): Promise<boolean> {
    const limiter = getLimiter(windowMs, maxRequests);

    // Graceful fallback: if Upstash is not configured, allow all requests
    if (!limiter) {
      return false;
    }

    const key = keyGenerator(req);
    const { success, limit, remaining, reset } = await limiter.limit(key);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(reset).toISOString());

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      res.status(429).json({
        error: message,
        retryAfter,
        limit: maxRequests,
        windowMs: windowMs / 1000
      });
      return true; // Request blocked
    }

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

  // Password reset: 3 requests per hour
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
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
