import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { getActiveLocation } from '@/lib/locationServer';
import { displayName, displayCategory, formatPrice } from '@/lib/format';
import Gallery from '@/components/Gallery';
import ProductDetailActions from '@/components/ProductDetailActions';
import MenuItemCard from '@/components/MenuItemCard';

// Dynamic for the same reason as /menu: clover_item_id is unique per Clover
// merchant, so the SAME product has a different id at each restaurant and the
// page must resolve against the customer's selected store.
export const dynamic = 'force-dynamic';

// `params.item` is the Clover item id -- same identifier already used by the
// `/menu?item=<clover_item_id>` deep-link convention, just promoted to a real
// path segment so this page is independently shareable/bookmarkable/indexable
// rather than only reachable via a query string that auto-opens a modal.
async function getItem(cloverItemId) {
  const supabase = getSupabasePublicClient();
  const location = await getActiveLocation();
  const { data: item, error } = await supabase
    .from('menu_items')
    .select('id, product_id, clover_item_id, name, category, price_cents, image_url, video_url, badge_text, description_override, modifiers')
    .eq('clover_item_id', cloverItemId)
    .eq('available', true)
    .eq('location', location)
    .maybeSingle();

  if (error || !item) return null;
  // A $0 item (priced by a Clover size choice) has a page only while the
  // options sheet is on -- otherwise it could not be ordered at its real price.
  if (item.price_cents <= 0) {
    const { data: settings } = await supabase
      .from('online_ordering_settings').select('options_enabled').eq('id', 1).maybeSingle();
    const sized = (item.modifiers || []).some(
      (g) => /size|quantity/i.test(g?.group_name || '') && (g.modifiers || []).some((o) => Number(o.price_cents) > 0)
    );
    if (settings?.options_enabled !== true || !sized) return null;
  }

  const [{ data: media }, { data: related }] = await Promise.all([
    // Gallery lives on the canonical product, so both restaurants show the
    // same photos without either having to re-upload them.
    supabase
      .from('menu_item_media')
      .select('media_type, url, sort_order')
      .eq('product_id', item.product_id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('menu_items')
      .select('clover_item_id, name, category, price_cents, image_url, video_url, badge_text, description_override, sort_order')
      .eq('category', item.category)
      .eq('available', true)
      .eq('location', location)
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

  const priceLabel = item.price_cents > 0
    ? formatPrice(item.price_cents)
    : `from ${formatPrice(Math.min(...(item.modifiers || []).filter((g) => /size|quantity/i.test(g?.group_name || '')).flatMap((g) => (g.modifiers || []).map((o) => Number(o.price_cents) || 0)).filter((p) => p > 0)))}`;

  // Two columns on desktop: a large photo that stays in view (sticky) while the
  // options column scrolls. On a phone: photo, then details, with the add bar
  // pinned to the bottom of the screen (ProductDetailActions variant "page").
  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 pt-6 pb-10 md:py-12">
      <Link
        href="/menu"
        className="inline-flex items-center gap-1.5 text-app-soft hover:text-highlight text-xs font-bold uppercase tracking-wide transition-colors mb-5 md:mb-8"
      >
        <span aria-hidden="true">←</span> Back to Menu
      </Link>

      <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-start">
        <div className="md:sticky md:top-24 rounded-app-lg overflow-hidden border" style={{ borderColor: 'var(--mimis-line)' }}>
          <Gallery
            media={item.media}
            fallbackImage={item.image_url}
            fallbackVideo={item.video_url}
            name={name}
            badgeText={item.badge_text}
            aspect="aspect-[4/3] md:aspect-square"
            sizes="(max-width: 768px) 100vw, 580px"
            lightboxEnabled
          />
        </div>

        <div className="min-w-0 flex flex-col">
          <p className="section-label mb-2">{displayCategory(item.category)}</p>
          <h1 className="font-serif font-bold text-3xl md:text-[2.5rem] text-app leading-tight">{name}</h1>
          <p className="text-highlight font-serif font-semibold text-2xl mt-2">{priceLabel}</p>

          {description ? (
            <p className="text-app-soft text-base leading-relaxed mt-4">{description}</p>
          ) : (
            <p className="text-app-faint text-base leading-relaxed mt-4 italic">Hand-prepared fresh to order.</p>
          )}

          <ProductDetailActions item={item} name={name} variant="page" />
        </div>
      </div>

      {item.related.length > 0 && (
        <div className="mt-16">
          <p className="section-label mb-1">You might also like</p>
          <h2 className="font-serif font-bold text-2xl text-app mb-5">More from {displayCategory(item.category)}</h2>
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
