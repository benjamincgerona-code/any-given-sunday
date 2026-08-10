import { createClient } from '@supabase/supabase-js';

// These come from your Supabase project settings (Project Settings > API).
// Set them as environment variables in Vercel — never hardcode them.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with the service role key — only used inside API routes,
// never exposed to the browser. Needed because players don't have real auth
// accounts, so row-level security can't key off auth.uid().
import { createClient as createServiceClient } from '@supabase/supabase-js';
export function supabaseAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
