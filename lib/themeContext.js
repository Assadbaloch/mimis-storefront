import { getSupabasePublicClient } from '@/lib/supabaseClient';

// Loads everything the <mimis-*> embeds need, in one place.
//
// Fetched once per render and shared between the theme layout (header/footer
// embeds) and the page body, so a page with a nav logo, several menu blocks and
// a footer address still costs one round of queries rather than one per embed.

export async function getEmbedContext() {
  const supabase = getSupabasePublicClient();

  const [menu, locations, hours, brand] = await Promise.all([
    supabase.from('menu_items').select('*').eq('available', true).order('sort_order', { ascending: true }),
    supabase.from('store_locations').select('*').order('location'),
    supabase.from('store_hours').select('*'),
    supabase.from('storefront_settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  return {
    menuItems: menu.data || [],
    locations: locations.data || [],
    hours: hours.data || [],
    brand: brand.data || {},
  };
}
