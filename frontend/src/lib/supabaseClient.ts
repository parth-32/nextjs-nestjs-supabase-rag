'use client';

import { createClient } from './supabase/client';

type SupabaseBrowserClient = ReturnType<typeof createClient>;

let client: SupabaseBrowserClient | null = null;

/** Browser Supabase client (singleton). Sessions are stored in cookies via @supabase/ssr. */
export function getSupabase(): SupabaseBrowserClient {
  if (!client) {
    client = createClient();
  }
  return client;
}
