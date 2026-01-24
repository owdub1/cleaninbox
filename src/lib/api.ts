/**
 * API Configuration
 * Centralized API URL management for frontend
 * Updated: Uses relative URLs for Vercel deployment
 */

// API URL configuration
// Production: Use Railway for API
// Development: Use localhost or VITE_API_URL if set
export const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://cleaninbox-production.up.railway.app' : 'http://localhost:5173');

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
