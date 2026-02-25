import type { VercelResponse } from '@vercel/node';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Set HTTP-only auth cookies on the response.
 *
 * - auth_token: short-lived access token (15 min), sent on every request
 * - refresh_token: long-lived (7 days), only sent to /api/auth/* endpoints
 *
 * Both are HttpOnly (JavaScript can't read them) and Secure in production.
 */
export function setAuthCookies(
  res: VercelResponse,
  tokens: { accessToken: string; refreshToken: string }
): void {
  const secure = IS_PRODUCTION ? '; Secure' : '';

  const authCookie = `auth_token=${tokens.accessToken}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=900`;
  const refreshCookie = `refresh_token=${tokens.refreshToken}; HttpOnly${secure}; SameSite=Strict; Path=/api/auth; Max-Age=604800`;

  // Preserve any existing Set-Cookie headers (e.g. CSRF cookie)
  const existing = res.getHeader('Set-Cookie');
  const cookies: string[] = [];

  if (existing) {
    if (Array.isArray(existing)) {
      cookies.push(...existing.map(String));
    } else {
      cookies.push(String(existing));
    }
  }

  cookies.push(authCookie, refreshCookie);
  res.setHeader('Set-Cookie', cookies);
}

/**
 * Expire both auth cookies. Call on logout.
 * Path values must match the ones used in setAuthCookies or the browser won't clear them.
 */
export function clearAuthCookies(res: VercelResponse): void {
  const secure = IS_PRODUCTION ? '; Secure' : '';

  const authCookie = `auth_token=; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=0`;
  const refreshCookie = `refresh_token=; HttpOnly${secure}; SameSite=Strict; Path=/api/auth; Max-Age=0`;

  const existing = res.getHeader('Set-Cookie');
  const cookies: string[] = [];

  if (existing) {
    if (Array.isArray(existing)) {
      cookies.push(...existing.map(String));
    } else {
      cookies.push(String(existing));
    }
  }

  cookies.push(authCookie, refreshCookie);
  res.setHeader('Set-Cookie', cookies);
}
