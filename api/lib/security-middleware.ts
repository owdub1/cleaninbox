import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Security Middleware for Input Validation and XSS Protection
 */

/**
 * Enhanced XSS Protection
 * Escapes HTML entities and strips dangerous characters
 *
 * @param input - User input string
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeHTML(
  input: string,
  options: {
    allowBasicFormatting?: boolean;
    maxLength?: number;
  } = {}
): string {
  const { allowBasicFormatting = false, maxLength } = options;

  // Trim whitespace
  let sanitized = input.trim();

  // Enforce max length
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // If basic formatting is not allowed, strip all HTML
  if (!allowBasicFormatting) {
    // Remove all HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // Remove potential script execution patterns
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/<script/gi, '')
    .replace(/<\/script/gi, '');

  return sanitized;
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();

  // Basic email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Additional security: remove any HTML entities
  const sanitized = sanitizeHTML(trimmed);

  // Verify it's still a valid email after sanitization
  if (!emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Validate and sanitize name (first name, last name)
 */
export function sanitizeName(name: string, maxLength: number = 100): string | null {
  if (!name) return null;

  const trimmed = name.trim();

  // Only allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;

  if (!nameRegex.test(trimmed)) {
    return null;
  }

  // Enforce max length
  if (trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeURL(url: string): string | null {
  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);

    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Remove javascript: and data: URLs
    if (trimmed.toLowerCase().includes('javascript:') || trimmed.toLowerCase().includes('data:')) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Input Validation Schemas
 */
export const ValidationSchemas = {
  /**
   * Validate signup request body
   */
  signup(body: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Email validation
    if (!body.email || typeof body.email !== 'string') {
      errors.push('Email is required');
    } else if (!sanitizeEmail(body.email)) {
      errors.push('Invalid email format');
    }

    // Password validation (basic check - detailed validation in auth-utils.ts)
    if (!body.password || typeof body.password !== 'string') {
      errors.push('Password is required');
    } else if (body.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    // First name validation (optional)
    if (body.firstName && typeof body.firstName === 'string') {
      if (!sanitizeName(body.firstName)) {
        errors.push('Invalid first name format');
      }
    }

    // Last name validation (optional)
    if (body.lastName && typeof body.lastName === 'string') {
      if (!sanitizeName(body.lastName)) {
        errors.push('Invalid last name format');
      }
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate login request body
   */
  login(body: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!body.email || typeof body.email !== 'string') {
      errors.push('Email is required');
    }

    if (!body.password || typeof body.password !== 'string') {
      errors.push('Password is required');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate password reset request
   */
  passwordReset(body: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!body.token || typeof body.token !== 'string') {
      errors.push('Reset token is required');
    }

    if (!body.password || typeof body.password !== 'string') {
      errors.push('New password is required');
    } else if (body.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    return { valid: errors.length === 0, errors };
  }
};

/**
 * Content-Type validation middleware
 * Ensures requests have proper Content-Type headers
 */
export function validateContentType(
  req: VercelRequest,
  res: VercelResponse,
  expectedType: string = 'application/json'
): boolean {
  const contentType = req.headers['content-type'];

  if (!contentType || !contentType.includes(expectedType)) {
    res.status(415).json({
      error: `Content-Type must be ${expectedType}`,
      code: 'UNSUPPORTED_MEDIA_TYPE'
    });
    return false;
  }

  return true;
}

/**
 * Request size validation
 * Prevents large payload attacks
 */
export function validateRequestSize(
  req: VercelRequest,
  res: VercelResponse,
  maxSizeKB: number = 100
): boolean {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const maxSizeBytes = maxSizeKB * 1024;

  if (contentLength > maxSizeBytes) {
    res.status(413).json({
      error: `Request body too large. Maximum size: ${maxSizeKB}KB`,
      code: 'PAYLOAD_TOO_LARGE'
    });
    return false;
  }

  return true;
}

/**
 * Allowed HTTP methods validation
 */
export function validateMethod(
  req: VercelRequest,
  res: VercelResponse,
  allowedMethods: string[]
): boolean {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.status(405).json({
      error: `Method ${req.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
      code: 'METHOD_NOT_ALLOWED'
    });
    res.setHeader('Allow', allowedMethods.join(', '));
    return false;
  }

  return true;
}

/**
 * Origin validation for CORS
 */
export function validateOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin || req.headers.referer;

  if (!origin) {
    // Allow requests with no origin (e.g., mobile apps, Postman)
    return true;
  }

  // In production, validate against allowed origins
  const allowedOrigins = [
    process.env.VITE_APP_URL,
    'https://cleaninbox.vercel.app',
    'https://cleaninbox.com'
  ].filter(Boolean) as string[];

  // Parse origin to compare just scheme+host (exact match, not startsWith)
  try {
    const originUrl = new URL(origin);
    const originBase = `${originUrl.protocol}//${originUrl.host}`;
    return allowedOrigins.some(allowed => {
      try {
        const allowedUrl = new URL(allowed);
        return originBase === `${allowedUrl.protocol}//${allowedUrl.host}`;
      } catch {
        return originBase === allowed;
      }
    });
  } catch {
    return false;
  }
}

/**
 * Combined security check middleware
 * Runs multiple security validations
 */
export function securityChecks(
  req: VercelRequest,
  res: VercelResponse,
  options: {
    allowedMethods?: string[];
    requireContentType?: string;
    maxSizeKB?: number;
    validateOrigin?: boolean;
  } = {}
): boolean {
  const {
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'],
    requireContentType,
    maxSizeKB = 100,
    validateOrigin: checkOrigin = true
  } = options;

  // Validate HTTP method
  if (!validateMethod(req, res, allowedMethods)) {
    return false;
  }

  // Validate Content-Type for POST/PUT/PATCH
  if (requireContentType && ['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
    if (!validateContentType(req, res, requireContentType)) {
      return false;
    }
  }

  // Validate request size
  if (!validateRequestSize(req, res, maxSizeKB)) {
    return false;
  }

  // Validate origin
  if (checkOrigin && !validateOrigin(req)) {
    res.status(403).json({
      error: 'Origin not allowed',
      code: 'FORBIDDEN'
    });
    return false;
  }

  return true;
}

/**
 * Sanitize entire request body recursively
 */
export function sanitizeRequestBody(body: any, maxDepth: number = 5): any {
  if (maxDepth === 0) return body;

  if (typeof body === 'string') {
    return sanitizeHTML(body);
  }

  if (Array.isArray(body)) {
    return body.map(item => sanitizeRequestBody(item, maxDepth - 1));
  }

  if (typeof body === 'object' && body !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(body)) {
      sanitized[key] = sanitizeRequestBody(value, maxDepth - 1);
    }
    return sanitized;
  }

  return body;
}
