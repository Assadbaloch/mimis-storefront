import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { displayName, displayCategory, formatPrice } from '@/lib/format';
import Gallery from '@/components/Gallery';
import ProductDetailActions from '@/components/ProductDetailActions';
import MenuItemCard from '@/components/MenuItemCard';

export const revalidate = 60;

// `params.item` is the Clover item id -- same identifier already used by the
// `/menu?item=<clover_item_id>` deep-link convention, just promoted to a real
// path segment so this page is independently shareable/bookmarkable/indexable
// rather than only reachable via a query string that auto-opens a modal.
async function getItem(cloverItemId) {
  const supabase = getSupabasePublicClient();
  const { data: item, error } = await supabase
    .from('menu_items')
    .select('id, clover_item_id, name, category, price_cents, image_url, video_url, badge_text, description_override')
    .eq('clover_item_id', cloverItemId)
    .eq('available', true)
    .gt('price_cents', 0)
    .maybeSingle();

  if (error || !item) return null;

  const [{ data: media }, { data: related }] = await Promise.all([
    supabase
      .from('menu_item_media')
      .select('media_type, url, sort_order')
      .eq('item_id', item.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('menu_items')
      .select('clover_item_id, name, category, price_cents, image_url, video_url, badge_text, description_override, sort_order')
      .eq('category', item.category)
      .eq('available', true)
      .gt('price_cents', 0)
      .neq('clover_item_id', cloverItemId)
      .order('sort_order', { ascending: true })
      .limit(4),
  ]);

  return { ...item, media: media || [], related: related || [] };
}

export async function generateMetadata({ params }) {
  const item = await getItem(params.item);
  if (!item) return { title: "Item not found — Mimi's Pizza & Burger" };
  const name = displayName(item.name);
  return {
    title: `${name} — Mimi's Pizza & Burger`,
    description: item.description_override || `Order ${name} fresh, halal, and made to order at Mimi's Pizza & Burger.`,
    openGraph: {
      title: name,
      description: item.description_override || undefined,
      images: item.image_url ? [{ url: item.image_url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }) {
  const item = await getItem(params.item);
  if (!item) notFound();

  const name = displayName(item.name);
  const description = item.description_override || null;

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14">
      <Link
        href="/menu"
        className="inline-flex items-center gap-1.5 text-cream/50 hover:text-gold text-xs font-bold uppercase tracking-wide transition-colors mb-6"
      >
        <span aria-hidden="true">←</span> Back to Menu
      </Link>

      <div className="grid md:grid-cols-[1.1fr,1fr] gap-8 md:gap-10">
        <div className="rounded-3xl overflow-hidden border border-cream/10">
          <Gallery
            media={item.media}
            fallbackImage={item.image_url}
            fallbackVideo={item.video_url}
            name={name}
            badgeText={item.badge_text}
            aspect="aspect-square md:aspect-[4/3]"
            lightboxEnabled
          />
        </div>

        <div>
          <p className="section-label mb-2">{displayCategory(item.category)}</p>
          <h1 className="font-serif font-bold text-3xl md:text-[2.25rem] text-cream leading-tight">{name}</h1>
          <p className="text-gold font-serif font-semibold text-2xl mt-2">{formatPrice(item.price_cents)}</p>

          {description ? (
            <p className="text-cream/65 text-base leading-relaxed mt-4">{description}</p>
          ) : (
            <p className="text-cream/35 text-base leading-relaxed mt-4 italic">Hand-prepared fresh to order.</p>
          )}

          <div className="mt-6">
            <ProductDetailActions item={item} name={name} />
          </div>
        </div>
      </div>

      {item.related.length > 0 && (
        <div className="mt-16">
          <p className="section-label mb-1">You might also like</p>
          <h2 className="font-serif font-bold text-2xl text-cream mb-5">More from {displayCategory(item.category)}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {item.related.map((r) => (
              <MenuItemCard key={r.clover_item_id} item={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
