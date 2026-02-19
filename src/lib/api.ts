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
      ...options?.headers,
    },
    credentials: 'include', // Important for cookies
  });
}
