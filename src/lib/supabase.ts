import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration keys for local storage cache or environment variables
const SUPABASE_URL_KEY = 'smart_forge_supabase_url';
const SUPABASE_ANON_KEY = 'smart_forge_supabase_anon_key';

export function getStoredSupabaseConfig(): { url: string; key: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://bkazilqmwujiyffshpmk.supabase.co';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(SUPABASE_URL_KEY) || envUrl;
  const storedKey = localStorage.getItem(SUPABASE_ANON_KEY) || envKey;

  return {
    url: storedUrl.trim(),
    key: storedKey.trim(),
  };
}

export function saveSupabaseConfig(url: string, key: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(SUPABASE_ANON_KEY, key.trim());
  // Reinitialize client
  supabaseInstance = null;
}

export function clearSupabaseConfig() {
  localStorage.removeItem(SUPABASE_URL_KEY);
  localStorage.removeItem(SUPABASE_ANON_KEY);
  supabaseInstance = null;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const { url, key } = getStoredSupabaseConfig();

  if (url && key && url.startsWith('http')) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return supabaseInstance;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return null;
}

export function isSupabaseConnected(): boolean {
  const client = getSupabase();
  return client !== null;
}
