import { Suspense } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { getActiveLocation } from '@/lib/locationServer';
import { displayCategory, categorySortIndex } from '@/lib/format';
import MenuBrowser from '@/components/MenuBrowser';
import MenuRewardBanner from '@/components/MenuRewardBanner';

// Was `revalidate = 60` (one cached page for everyone). The menu now differs
// per restaurant, so a single shared cache entry would serve one store's menu
// to the other store's customers. Reading the location cookie makes this
// route dynamic; per-request rendering is the correct trade here.
export const dynamic = 'force-dynamic';

async function getMenu(location) {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, product_id, clover_item_id, name, category, price_cents, image_url, video_url, badge_text, description_override, sort_order')
    .eq('available', true)
    .eq('location', location)
    .gt('price_cents', 0)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('getMenu', error.message);
    return [];
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
      </section>
      <MenuRewardBanner />
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
