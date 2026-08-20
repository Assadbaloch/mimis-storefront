import { getSupabasePublicClient } from '@/lib/supabaseClient';

// Which built-in design the storefront renders.
//
// Precedence, highest first:
//   1. an active row in mimis.themes  -> imported HTML theme (lib/theme.js)
//   2. storefront_settings.active_design
//   3. 'original'
//
// The second built-in exists because a second design routed through the HTML
// theme pipeline could not work reliably: the reference is Tailwind v4 and the
// storefront is Tailwind v3, and the two stylesheets collide on shared class
// names -- unlayered rules beat layered ones regardless of load order, so
// whichever sheet was promoted broke the other half of the site. Compiling the
// design with the app removes the conflict rather than working around it.

export const DESIGNS = ['original', 'reference'];
export const DEFAULT_DESIGN = 'original';

/** Site logo, from Storefront Settings. Shared by the reference chrome. */
export async function getLogoUrl() {
  const supabase = getSupabasePublicClient();
  const { data } = await supabase
    .from('storefront_settings').select('logo_url').eq('id', 1).maybeSingle();
  return data?.logo_url || null;
}

export async function getActiveDesign() {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('storefront_settings')
    .select('active_design')
    .eq('id', 1)
    .maybeSingle();

  // Any failure falls back to the original design. A missing settings row or a
  // transient error must never leave the storefront without chrome.
  if (error || !data) return DEFAULT_DESIGN;
  return DESIGNS.includes(data.active_design) ? data.active_design : DEFAULT_DESIGN;
}
