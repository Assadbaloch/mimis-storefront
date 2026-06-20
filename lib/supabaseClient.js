import { createClient } from '@supabase/supabase-js';

// Public, anon-key client. Reads only what anon RLS policies allow: available
// menu_items, plus the narrow get_order_status() RPC. Safe to import from both
// Server and Client Components (no secrets -- the anon key is meant to be public
// and is protected by RLS, not secrecy). Mirrors the exact client + key already
// hardcoded in dashboard/index.html and kds/index.html (db.schema: 'mimis' --
// all Mimi's data lives in the mimis schema, never public). Env vars can still
// override these for a future multi-client deployment.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://igchqqyassrfpsliyjec.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnY2hxcXlhc3NyZnBzbGl5amVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTM5MDIsImV4cCI6MjA5NjQyOTkwMn0.Vr4yvjKVFSj4dAi2HI5d0Y09_AvbJoL9BnitI4irTo8';

let cached;

export function getSupabasePublicClient() {
  if (!cached) {
    cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { db: { schema: 'mimis' } });
  }
  return cached;
}
