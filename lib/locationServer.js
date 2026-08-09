import { cookies } from 'next/headers';
import { getSupabasePublicClient } from '@/lib/supabaseClient';

// Server-side half of the location preference (see lib/location.jsx for the
// client half and why both exist).
//
// Server Components render before any client JS runs, so they cannot read the
// localStorage copy -- they read the cookie the picker writes alongside it.
// Calling cookies() opts the calling route out of static generation, which is
// correct here: /menu genuinely differs per customer now, so a single cached
// HTML page can no longer serve everyone.

export const LOCATION_COOKIE = 'mimis-location';
export const DEFAULT_LOCATION = 'Madison Heights';

// Resolves the location to render for this request, validated against the
// stores that actually exist. An unknown/stale cookie value falls back rather
// than filtering the menu down to zero rows.
export async function getActiveLocation() {
  const store = await cookies();
  const raw = store.get(LOCATION_COOKIE)?.value;
  const requested = raw ? decodeURIComponent(raw) : null;
  if (!requested) return DEFAULT_LOCATION;

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('store_locations')
    .select('location')
    .eq('location', requested)
    .maybeSingle();

  if (error || !data) return DEFAULT_LOCATION;
  return data.location;
}
