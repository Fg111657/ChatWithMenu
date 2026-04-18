/**
 * User Mapping Service
 *
 * Maps Supabase UUIDs to SQLite integer user IDs
 * This is a bridge until the database is fully migrated to Supabase
 */

import { supabase } from './supabaseClient';
import { apiFetchJSON } from './apiClient';

const MAPPING_STORAGE_KEY = 'user_id_mapping';

/**
 * Get or create a SQLite user for the current Supabase user
 *
 * @param {string} inviteCode - Optional invite code for privileged roles
 * @returns {Promise<number>} The integer user ID for database queries
 */
export async function getOrCreateDatabaseUser(inviteCode = '') {
  try {
    // Get current Supabase session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      throw new Error('No active session');
    }

    const supabaseUser = session.user;
    const supabaseUUID = supabaseUser.id;
    const email = supabaseUser.email;
    const name = supabaseUser.user_metadata?.name || email.split('@')[0];

    // Check if we have a cached mapping
    const cached = getCachedMapping(supabaseUUID);
    if (cached) {
      return cached;
    }

    // Use the existing getOrCreateUser endpoint
    try {
      const userData = await apiFetchJSON(`/getOrCreateUser`, {
        method: 'POST',
        body: {
          email,
          name,
          password: 'supabase_managed', // Password not used for Supabase users
          bio: `Supabase user: ${supabaseUUID}`,
          invite_code: inviteCode || '' // Include invite code if provided
        }
      });

      if (userData.id) {
        // Found or created user - cache and return
        cacheMapping(supabaseUUID, userData.id);
        return userData.id;
      }
    } catch (err) {
      console.error('Failed to get/create database user:', err);
    }

    // Fallback: Return a default user ID
    console.warn('Could not map Supabase user to database user');
    return null;

  } catch (error) {
    console.error('Error in user mapping:', error);
    return null;
  }
}

/**
 * Cache the UUID -> integer ID mapping
 */
function cacheMapping(supabaseUUID, integerId) {
  const mapping = {
    supabase_uuid: supabaseUUID,
    integer_id: integerId,
    cached_at: Date.now()
  };
  localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mapping));
}

/**
 * Get cached mapping if it exists and is recent
 */
function getCachedMapping(supabaseUUID) {
  try {
    const cached = localStorage.getItem(MAPPING_STORAGE_KEY);
    if (!cached) return null;

    const mapping = JSON.parse(cached);

    // Check if mapping matches and is less than 1 hour old
    if (mapping.supabase_uuid === supabaseUUID) {
      const age = Date.now() - mapping.cached_at;
      if (age < 3600000) { // 1 hour
        return mapping.integer_id;
      }
    }
  } catch (err) {
    console.error('Error reading cached mapping:', err);
  }
  return null;
}

/**
 * Clear the cached mapping (call on logout)
 */
export function clearUserMapping() {
  localStorage.removeItem(MAPPING_STORAGE_KEY);
}
