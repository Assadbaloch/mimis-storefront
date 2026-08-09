import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { getActiveLocation } from '@/lib/locationServer';

// Loads everything the <mimis-*> embeds need, in one place.
//
// Fetched once per render and shared between the theme layout (header/footer
// embeds) and the page body, so a page with a nav logo, several menu blocks and
// a footer address still costs one round of queries rather than one per embed.
//
// Menu rows are scoped to the customer's selected restaurant -- a themed site
// renders its product blocks from this same context, so an unscoped list made
// every shared item appear twice inside themes too.

export async function getEmbedContext() {
  const supabase = getSupabasePublicClient();
  const location = await getActiveLocation();

  const [menu, locations, hours, brand] = await Promise.all([
    supabase.from('menu_items').select('*').eq('available', true).eq('location', location).order('sort_order', { ascending: true }),
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
