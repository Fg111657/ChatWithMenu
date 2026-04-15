/**
 * API Client with automatic Supabase JWT injection
 *
 * This ensures all backend requests include the Authorization header
 * with the current Supabase access token.
 */

import { supabase } from './supabaseClient';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Make an authenticated API request
 *
 * @param {string} path - API endpoint path (e.g., '/modifyUser/123')
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function apiFetch(path, { method = 'GET', headers = {}, body } = {}) {
  // Get current Supabase session
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  // Check if body is FormData
  const isFormData = body instanceof FormData;

  // Prepare headers
  const requestHeaders = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...headers,
  };

  // Add Authorization header if token exists
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Make the request
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  return response;
}

/**
 * Make an authenticated API request and parse JSON response
 *
 * @param {string} path - API endpoint path
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Parsed JSON response
 */
export async function apiFetchJSON(path, options = {}) {
  const response = await apiFetch(path, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API request failed: ${response.status}`);
  }

  return response.json();
}

export default apiFetch;
