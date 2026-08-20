import Link from 'next/link';
import Image from 'next/image';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { getActiveLocation } from '@/lib/locationServer';
import { displayName, displayCategory } from '@/lib/format';
import MenuItemCard from '@/components/MenuItemCard';
import { getThemePage } from '@/lib/theme';
import ThemePageBody from '@/components/ThemePageBody';
import PageSections from '@/components/PageSections';
import { getHomeSlots } from '@/lib/homeSlots';
import { getStoreLocations } from '@/lib/storeLocations';
import { getActiveDesign } from '@/lib/design';
import ReferenceHome from '@/components/designs/reference/ReferenceHome';

// Dynamic rather than `revalidate = 60`: every card below deep-links to
// /menu/<clover_item_id>, and those ids are per-Clover-merchant. A cached
// homepage built from one store's items would hand the other store's
// customers links that 404 on arrival.
export const dynamic = 'force-dynamic';

async function getFeaturedItems(location) {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('clover_item_id, name, price_cents, image_url, video_url, badge_text, description_override')
    .eq('available', true)
    .eq('location', location)
    .eq('featured', true)
    .order('sort_order', { ascending: true })
    .limit(4);
  if (error) {
    console.error('getFeaturedItems', error.message);
    return [];
  }
  return data || [];
}

// Real photos/videos uploaded via /admin/menu — used for the hero backdrop and
// the "From Our Kitchen" gallery. No stock imagery: this grows automatically as
// the owner uploads more product media, videos first.
async function getGalleryMedia(location) {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('clover_item_id, name, image_url, video_url')
    .eq('available', true)
    .eq('location', location)
    .or('image_url.not.is.null,video_url.not.is.null')
    .order('sort_order', { ascending: true })
    .limit(8);
  if (error) {
    console.error('getGalleryMedia', error.message);
    return [];
  }
  // videos first so the hero backdrop prefers motion when available
  return (data || []).slice().sort((a, b) => (b.video_url ? 1 : 0) - (a.video_url ? 1 : 0));
}

// "Featured in the news" clips, managed from /admin/settings. Public/anon RLS
// on mimis.news_media filters to active = true, so this never needs to filter
// client-side.
// Full menu list, used only so a "Popular items" block can resolve items the
// owner pinned by hand -- those ids won't be in the auto-featured set.
async function getAllMenuItems(location) {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, clover_item_id, name, price_cents, image_url, video_url, badge_text, description_override, category')
    .eq('available', true)
    .eq('location', location)
    .gt('price_cents', 0)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getAllMenuItems', error.message);
    return [];
  }
  return data || [];
}

async function getNewsMedia() {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('news_media')
    .select('id, media_type, url, caption')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getNewsMedia', error.message);
    return [];
  }
  return data || [];
}

// One real photo/video per category, for the "Made fresh, the right way" showcase —
// no stock photography. Grows/changes automatically as real product media is uploaded.
async function getCategoryShowcase(location) {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('clover_item_id, name, category, image_url, video_url')
    .eq('available', true)
    .eq('location', location)
    .or('image_url.not.is.null,video_url.not.is.null')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getCategoryShowcase', error.message);
    return [];
  }
  const seenCategories = new Set();
  const showcase = [];
  for (const item of data || []) {
    const cat = (item.category || '').trim() || 'Uncategorized';
    if (seenCategories.has(cat)) continue;
    seenCategories.add(cat);
    showcase.push(item);
    if (showcase.length >= 4) break;
  }
  return showcase;
}

export default async function HomePage() {
  // A theme's home page (slug '') takes over "/" when a theme is active.
  // Without this, an activated theme would style every route except the one
  // customers land on first, which is the most visible page of all.
  const themeHome = await getThemePage('');
  if (themeHome) return <ThemePageBody page={themeHome} />;

  // Built-in design 2. Checked after the theme so precedence is unchanged, and
  // before any of the original design's work below so none of it runs need-
  // lessly. The original design's code path is untouched.
  if ((await getActiveDesign()) === 'reference') return <ReferenceHome />;

  const location = await getActiveLocation();
  const featured = await getFeaturedItems(location);
  const gallery = await getGalleryMedia(location);
  const showcase = await getCategoryShowcase(location);
  const newsMedia = await getNewsMedia();
  // Owner-authored blocks from /admin/pages → "Home page". Empty by default,
  // so the page looks identical until something is actually added.
  const slots = await getHomeSlots();
  const storeLocations = await getStoreLocations();
  const heroMedia = gallery[0] || null;

  // Data the owner-editable blocks draw on. They keep pulling live content
  // (featured items, uploaded menu photos, press clips) rather than freezing
  // whatever was picked the day the block was added.
  const homeData = { featured, gallery, showcase, newsMedia };

  // FULL-CMS MODE: once the home page has its own sections, they compose the
  // whole page in the order set in /admin/pages. The hardcoded design below is
  // the fallback for when there are none -- and unpublishing the Home page
  // record brings it straight back, which is the one-click undo.
  if (slots.all.length) {
    // Only pay for the full menu when a block might actually need it.
    const needsMenu = slots.all.some((s) =>
      ['featured_items', 'product_category', 'product_showcase'].includes(s.type));
    const menuItems = needsMenu ? await getAllMenuItems(location) : featured;
    return (
      <PageSections
        sections={slots.all}
        menuItems={menuItems}
        storeLocations={storeLocations}
        homeData={homeData}
      />
    );
  }

  return (
    <>
      {/* HERO */}
      <section className="relative px-5 md:px-8 pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden">
        {heroMedia ? (
          <div className="absolute inset-0">
            {heroMedia.video_url ? (
              <video
                src={heroMedia.video_url}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[1px] scale-105"
              />
            ) : (
              <Image
                src={heroMedia.image_url}
                alt=""
                fill
                priority
                className="object-cover opacity-25 blur-[1px] scale-105"
                sizes="100vw"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/75 to-ink" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brick/20 via-ink to-ink" />
        )}
        <div className="max-w-6xl mx-auto relative text-center">
          <p className="section-label mb-5 animate-fade-in">Madison Heights &amp; Warren, Michigan</p>
          <h1 className="font-serif font-bold text-5xl md:text-7xl leading-[1.05] text-cream animate-scale-in" style={{ animationDelay: '60ms' }}>
            Real ingredients.<br />
            Real <span className="italic text-gold">halal.</span> Real fresh.
          </h1>
          <p className="text-cream/65 max-w-xl mx-auto mt-6 text-base md:text-lg leading-relaxed animate-fade-in" style={{ animationDelay: '160ms' }}>
            Hand-stretched pizza, smash burgers, and made-to-order favorites — fired fresh
            for every order, every time.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10 animate-fade-in" style={{ animationDelay: '240ms' }}>
            <Link href="/menu" className="btn-primary">Start an Order</Link>
            <Link href="#locations" className="btn-secondary">Our Locations</Link>
          </div>
        </div>
      </section>

      {/* Owner slot: directly under the hero. */}
      <PageSections sections={slots.top} storeLocations={storeLocations} />

      {/* POPULAR THIS WEEK */}
      {featured.length > 0 && (
        <section className="px-5 md:px-8 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="section-label mb-2">Crowd Favorites</p>
                <h2 className="font-serif font-bold text-3xl md:text-4xl text-cream">Popular this week</h2>
              </div>
              <Link href="/menu" className="nav-link hidden sm:inline">View Full Menu &rarr;</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {featured.map((item) => (
                <MenuItemCard key={item.clover_item_id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Owner slot: after "Popular this week". */}
      <PageSections sections={slots.middle} storeLocations={storeLocations} />

      {/* HALAL TRUST SECTION — a solid Yummy Classic blue band.
          Was a hardcoded dark emerald gradient with themed `text-cream` text;
          when that token flipped to near-black in the light recolour it left
          black-on-dark-green and was unreadable. The band class now owns both
          its background and its foreground so they can never drift apart. */}
      <section className="band-solid band-blue px-5 md:px-8 py-20 overflow-hidden">
        <div className="max-w-5xl mx-auto relative flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
          <div className="band-emblem w-24 h-24 shrink-0 rounded-full flex items-center justify-center">
            <span className="text-3xl">&#9670;</span>
          </div>
          <div>
            <p className="section-label mb-2">Our Promise</p>
            <h2 className="font-serif font-bold text-3xl md:text-4xl mb-3">Certified halal. Every order, every time.</h2>
            <p className="band-lede max-w-xl leading-relaxed">
              Every kitchen sources halal-certified meat and prepares it with dedicated equipment
              and procedures — no shortcuts, no substitutions.
            </p>
          </div>
        </div>
      </section>

      {/* OUR CRAFT — real product media, one per category, no stock photography */}
      {showcase.length > 0 && (
        <section className="px-5 md:px-8 py-20 border-t border-cream/10">
          <div className="max-w-6xl mx-auto">
            <p className="section-label mb-2 text-center">How We Do It</p>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-cream text-center mb-12">Made fresh, the right way</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {showcase.map((item) => (
                <Link
                  key={item.clover_item_id}
                  href="/menu"
                  className="menu-card relative aspect-square rounded-2xl overflow-hidden bg-cream/[0.04] border border-cream/10 hover:border-gold/40 block"
                >
                  {item.video_url ? (
                    <video src={item.video_url} autoPlay muted loop playsInline className="menu-media absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <Image src={item.image_url} alt={displayCategory(item.category)} fill className="menu-media object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-scrim to-transparent p-3">
                    <p className="text-white text-xs font-semibold">{displayCategory(item.category)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LOCATIONS */}
      <section id="locations" className="px-5 md:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <p className="section-label mb-2 text-center">Where to Find Us</p>
          <h2 className="font-serif font-bold text-3xl md:text-4xl text-cream text-center mb-12">Two Michigan kitchens</h2>
          {/* Driven by mimis.store_locations — was a hardcoded array that still
              said Warren was "Opening Soon" weeks after it started trading, and
              couldn't be corrected from the admin. */}
          <div className="grid md:grid-cols-2 gap-6">
            {storeLocations.map((loc) => (
              <div key={loc.key} className="menu-card rounded-2xl border border-cream/10 bg-cream/[0.03] p-7 hover:border-gold/30">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="font-serif font-semibold text-xl text-cream">{loc.name}</h3>
                  {loc.status && (
                    <span className={`text-[11px] font-bold uppercase tracking-wide rounded-full px-3 py-1 shrink-0 ${loc.live ? 'bg-gold/15 text-gold' : 'bg-cream/10 text-cream/60'}`}>
                      {loc.status}
                    </span>
                  )}
                </div>
                <p className="text-cream/60 text-sm">{loc.address}</p>
                {loc.phone && (
                  <a href={`tel:${loc.phone.replace(/[^\d+]/g, '')}`} className="text-cream/50 text-sm hover:text-gold mt-1 inline-block">
                    {loc.phone}
                  </a>
                )}
                {loc.live && (
                  <Link href="/menu" className="btn-primary mt-5 inline-flex">Order from this kitchen</Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF — solid yellow band. Yummy Classic alternates full-bleed
          blocks of brand colour rather than running white end to end; this and
          the blue halal band above are what give the page that rhythm. Yellow
          carries near-black text (set by .band-yellow) for contrast. */}
      <section className="band-solid band-yellow px-5 md:px-8 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center gap-1 text-xl mb-4">
            {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
          </div>
          <h2 className="font-serif font-bold text-2xl md:text-3xl">Loved across Madison Heights &amp; Warren</h2>
          <p className="band-lede mt-3">Join the neighbors who order from us every week.</p>
        </div>
      </section>

      {/* FROM OUR KITCHEN — real product photos/videos uploaded via /admin/menu */}
      {gallery.length > 0 && (
        <section className="px-5 md:px-8 py-20 border-t border-cream/10">
          <div className="max-w-6xl mx-auto">
            <p className="section-label mb-2 text-center">From Our Kitchen</p>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-cream text-center mb-12">A closer look</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {gallery.map((g) => (
                <Link
                  key={g.clover_item_id}
                  href="/menu"
                  className="menu-card relative aspect-square rounded-2xl overflow-hidden bg-cream/[0.04] border border-cream/10 hover:border-gold/40 block"
                >
                  {g.video_url ? (
                    <video src={g.video_url} autoPlay muted loop playsInline className="menu-media absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <Image src={g.image_url} alt={displayName(g.name)} fill className="menu-media object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-scrim to-transparent p-3">
                    <p className="text-white text-xs font-semibold truncate">{displayName(g.name)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* "Featured in the news" was removed from this design (2026-08-10, owner
          request). It still exists as an optional "As seen in the news" block
          in the page builder for anyone who wants it back. */}

      {/* Owner slot: above the footer. Also the default landing place for any
          section saved without an explicit slot. */}
      <PageSections sections={slots.bottom} storeLocations={storeLocations} />
    </>
  );
}
