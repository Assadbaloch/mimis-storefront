import { Suspense } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { getActiveLocation } from '@/lib/locationServer';
import { displayCategory, categorySortIndex } from '@/lib/format';
import MenuBrowser from '@/components/MenuBrowser';
import MenuRewardBanner from '@/components/MenuRewardBanner';
import PromoBanner from '@/components/PromoBanner';

// Was `revalidate = 60` (one cached page for everyone). The menu now differs
// per restaurant, so a single shared cache entry would serve one store's menu
// to the other store's customers. Reading the location cookie makes this
// route dynamic; per-request rendering is the correct trade here.
export const dynamic = 'force-dynamic';

async function getMenu(location) {
  const supabase = getSupabasePublicClient();
  // Items whose whole price is a Clover size choice (wings, fries: $0 base)
  // are listed only when the options sheet is switched on, because only then
  // can the customer pick the size the register would charge for.
  const { data: settings } = await supabase
    .from('online_ordering_settings').select('options_enabled').eq('id', 1).maybeSingle();
  const optionsEnabled = settings?.options_enabled === true;

  const { data: rows, error } = await supabase
    .from('menu_items')
    .select('id, product_id, clover_item_id, name, category, price_cents, image_url, video_url, badge_text, description_override, sort_order, modifiers')
    .eq('available', true)
    .eq('location', location)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('getMenu', error.message);
    return [];
  }
  // Option data stays on the server: the grid only needs "does it need a size
  // choice" and "from $X". The sheet loads the full options when opened, so
  // the menu page stays as light as before.
  const data = [];
  for (const row of rows || []) {
    const { modifiers, ...item } = row;
    const sizeGroups = (Array.isArray(modifiers) ? modifiers : []).filter(
      (g) => /size|quantity/i.test(g?.group_name || '') && (g.modifiers || []).some((o) => Number(o.price_cents) > 0)
    );
    if (item.price_cents > 0) { data.push(item); continue; }
    if (!optionsEnabled || !sizeGroups.length) continue;
    const prices = sizeGroups.flatMap((g) => g.modifiers.map((o) => Number(o.price_cents) || 0)).filter((p) => p > 0);
    data.push({ ...item, needs_choice: true, from_price_cents: Math.min(...prices) });
  }

  const byCategory = new Map();
  for (const item of data) {
    const key = (item.category || '').trim() || 'Uncategorized';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(item);
  }

  return Array.from(byCategory.entries())
    .map(([key, items]) => ({ key, label: displayCategory(key), items }))
    .sort((a, b) => categorySortIndex(a.key) - categorySortIndex(b.key));
}

export default async function MenuPage() {
  const location = await getActiveLocation();
  const groups = await getMenu(location);

  return (
    <>
      <section className="px-5 md:px-8 pt-16 pb-10 text-center">
        <p className="section-label mb-3">Our Menu</p>
        <h1 className="font-serif font-bold text-4xl md:text-5xl text-app">Made fresh. Made halal.</h1>
        <p className="text-app-soft max-w-lg mx-auto mt-4">
          Every item below is live and ready to order — if it&rsquo;s on the menu, it&rsquo;s in stock.
        </p>
        {/* The two restaurants have genuinely different menus and prices, so
            which one you're looking at can't be left implicit. */}
        <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs text-app-soft">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Showing the <span className="font-bold text-app">{location}</span> menu
        </p>
      </section>
      <MenuRewardBanner />
      <PromoBanner placement="menu" />
      {groups.length > 0 ? (
        <Suspense fallback={null}>
          <MenuBrowser groups={groups} />
        </Suspense>
      ) : (
        <p className="text-center text-app-soft py-20">The menu is temporarily unavailable. Please check back shortly.</p>
      )}
    </>
  );
}
