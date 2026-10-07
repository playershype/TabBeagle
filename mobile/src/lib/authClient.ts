import { createClient, type SupportedStorage } from '@supabase/supabase-js';
export function createAuthClient(url: string, key: string, storage: SupportedStorage, fetcher: typeof fetch = fetch) {
  return createClient(url, key, {
    global: { fetch: fetcher },
    auth: { storage, flowType: 'pkce', autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
}
