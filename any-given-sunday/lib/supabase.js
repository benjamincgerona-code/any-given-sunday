import { createClient } from '@supabase/supabase-js';

// These come from your Supabase project settings (Project Settings > API).
// Set them as environment variables in Vercel — never hardcode them.
// Created lazily (not at module load) so a build with no env vars set yet
// doesn't crash just importing this file.
let browserClient;
export function getSupabase() {
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return browserClient;
}

// Server-side client with the service role key — only used inside API routes,
// never exposed to the browser. Needed because players don't have real auth
// accounts, so row-level security can't key off auth.uid().
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
