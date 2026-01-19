/**
 * API Configuration
 * Centralized API URL management for frontend
 */

// Get API URL from environment variable
// Development: Falls back to localhost:3001 (Railway dev server)
// Production: Uses Railway URL
export const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://cleaninbox-production.up.railway.app' : 'http://localhost:3001');

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
