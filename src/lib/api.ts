/**
 * API Configuration
 * Centralized API URL management for frontend
 */

// Get API URL from environment variable
// Production: Empty string (same origin - frontend and API on same Vercel project)
// Development: Falls back to localhost
export const API_URL = import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? '' : 'http://localhost:5173');

/**
 * CSRF headers removed — SameSite=Strict cookies + CORS provide CSRF protection.
 * Kept as no-op so callers don't need updating.
 */
export function getCSRFHeaders(): Record<string, string> {
  return {};
}

/**
 * Helper function to make API calls with proper URL.
 * Auth is handled via HTTP-only cookies (sent automatically by the browser).
 */
export async function apiRequest(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const url = `${API_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getCSRFHeaders(),
      ...options?.headers,
    },
    credentials: 'include', // Important for cookies
  });
}

/**
 * Make an authenticated API call with automatic retry on 401.
 * If the access token expired, refreshes it and retries once.
 */
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit,
  refreshFn: () => Promise<boolean>
): Promise<Response> {
  const url = `${API_URL}${endpoint}`;
  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getCSRFHeaders(),
      ...options.headers,
    },
    credentials: 'include',
  };

  let response = await fetch(url, fetchOptions);

  if (response.status === 401) {
    const refreshed = await refreshFn();
    if (refreshed) {
      response = await fetch(url, fetchOptions);
    }
  }

  return response;
}
