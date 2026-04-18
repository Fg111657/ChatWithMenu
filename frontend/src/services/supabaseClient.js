import { createClient } from '@supabase/supabase-js';

// FRONTEND ONLY - uses anon key (safe for public)
// Service role key must NEVER be in frontend

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars not set. Auth will not work.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = Boolean(supabase);

export function getSupabaseClientOrThrow() {
  if (!supabase) {
    throw new Error('Login is temporarily unavailable because authentication is not configured.');
  }
  return supabase;
}
