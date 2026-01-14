/**
 * Authentication Utility Functions
 * Shared utilities for auth endpoints
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token using SHA-256 (for storing refresh tokens)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'abc123', 'password123',
    'letmein', 'welcome', 'monkey', '1234567890', 'password1'
  ];

  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password is too common. Please choose a more unique password');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get client IP address from request
 */
export function getClientIP(req: any): string {
  // Check various headers for IP address (in order of preference)
  const ip =
    req.headers['cf-connecting-ip'] || // Cloudflare
    req.headers['x-real-ip'] || // nginx
    req.headers['x-forwarded-for']?.split(',')[0] || // Most proxies
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '0.0.0.0';

  return ip;
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: any): string {
  return req.headers['user-agent'] || 'Unknown';
}

/**
 * Parse expiry time string (e.g., '15m', '7d', '1h') to milliseconds
 */
export function parseExpiryTime(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Invalid expiry format. Use format like: 15m, 1h, 7d');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    's': 1000,           // seconds
    'm': 60 * 1000,      // minutes
    'h': 60 * 60 * 1000, // hours
    'd': 24 * 60 * 60 * 1000 // days
  };

  return value * multipliers[unit];
}

/**
 * Calculate expiration timestamp from now + duration
 */
export function getExpirationDate(duration: string): Date {
  const milliseconds = parseExpiryTime(duration);
  return new Date(Date.now() + milliseconds);
}

/**
 * Check if a date is in the past
 */
export function isExpired(date: Date): boolean {
  return new Date(date) < new Date();
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string, rounds: number = 10): Promise<string> {
  return bcrypt.hash(password, rounds);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Calculate password strength score (0-100)
 */
export function calculatePasswordStrength(password: string): number {
  let score = 0;

  // Length score (max 30 points)
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Character variety (max 40 points)
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 10;

  // Complexity (max 30 points)
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.5) score += 10;
  if (uniqueChars >= password.length * 0.7) score += 10;
  if (!/(012|123|234|345|456|567|678|789|890|abc|bcd|cde)/.test(password.toLowerCase())) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
