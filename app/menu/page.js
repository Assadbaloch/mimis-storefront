import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { displayCategory, categorySortIndex } from '@/lib/format';
import MenuBrowser from '@/components/MenuBrowser';

export const revalidate = 60;

async function getMenu() {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('clover_item_id, name, category, price_cents, image_url, badge_text, description_override, sort_order')
    .eq('available', true)
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
  const groups = await getMenu();

  return (
    <>
      <section className="px-5 md:px-8 pt-16 pb-10 text-center">
        <p className="section-label mb-3">Our Menu</p>
        <h1 className="font-serif font-bold text-4xl md:text-5xl text-cream">Made fresh. Made halal.</h1>
        <p className="text-cream/60 max-w-lg mx-auto mt-4">
          Every item below is pulled live from our kitchen&rsquo;s POS — if it&rsquo;s on the menu, it&rsquo;s in stock.
        </p>
      </section>
      {groups.length > 0 ? (
        <MenuBrowser groups={groups} />
      ) : (
        <p className="text-center text-cream/50 py-20">The menu is temporarily unavailable. Please check back shortly.</p>
      )}
    </>
  );
}
