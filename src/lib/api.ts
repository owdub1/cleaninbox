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
 * Get standard auth headers (Authorization + CSRF token)
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const csrfToken = localStorage.getItem('csrf_token');
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }
  return headers;
}

/**
 * Helper function to make API calls with proper URL
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
      ...getAuthHeaders(),
      ...options?.headers,
    },
    credentials: 'include', // Important for cookies
  });
}
