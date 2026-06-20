import Link from 'next/link';
import Image from 'next/image';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { displayName } from '@/lib/format';
import MenuItemCard from '@/components/MenuItemCard';

export const revalidate = 60;

// Generic decorative stock photography (CC0 / public domain, no attribution required)
// for ambiance/design only — never used for product cards, the product modal, or the
// "From Our Kitchen" gallery, which are reserved for real owner-uploaded photos/videos.
const STOCK = {
  heroFallback: 'https://igchqqyassrfpsliyjec.supabase.co/storage/v1/object/public/restaurant-media/site-design/hero-pizza.jpg',
  halalBackdrop: 'https://igchqqyassrfpsliyjec.supabase.co/storage/v1/object/public/restaurant-media/site-design/pizza-overhead.jpg',
  doughPrep: 'https://igchqqyassrfpsliyjec.supabase.co/storage/v1/object/public/restaurant-media/site-design/dough-prep.jpg',
  cheeseCloseup: 'https://igchqqyassrfpsliyjec.supabase.co/storage/v1/object/public/restaurant-media/site-design/cheese-closeup.jpg',
  freshVeg: 'https://igchqqyassrfpsliyjec.supabase.co/storage/v1/object/public/restaurant-media/site-design/fresh-veg.jpg',
  cheeseburger: 'https://igchqqyassrfpsliyjec.supabase.co/storage/v1/object/public/restaurant-media/site-design/cheeseburger.jpg',
};

async function getFeaturedItems() {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('clover_item_id, name, price_cents, image_url, video_url, badge_text, description_override')
    .eq('available', true)
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
async function getGalleryMedia() {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('clover_item_id, name, image_url, video_url')
    .eq('available', true)
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

export default async function HomePage() {
  const featured = await getFeaturedItems();
  const gallery = await getGalleryMedia();
  const heroMedia = gallery[0] || null;

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
          <div className="absolute inset-0">
            <Image
              src={STOCK.heroFallback}
              alt=""
              fill
              priority
              className="object-cover opacity-25 blur-[1px] scale-105"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/75 to-ink" />
          </div>
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

      {/* HALAL TRUST SECTION */}
      <section className="relative px-5 md:px-8 py-20 overflow-hidden border-y border-emerald-800/40">
        <div className="absolute inset-0">
          <Image src={STOCK.halalBackdrop} alt="" fill className="object-cover opacity-20" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900/95 to-emerald-950" />
        </div>
        <div className="max-w-5xl mx-auto relative flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
          <div className="w-24 h-24 shrink-0 rounded-full border-2 border-gold flex items-center justify-center bg-emerald-950">
            <span className="text-gold text-3xl">&#9670;</span>
          </div>
          <div>
            <p className="section-label mb-2">Our Promise</p>
            <h2 className="font-serif font-bold text-3xl md:text-4xl text-cream mb-3">Certified halal. Every order, every time.</h2>
            <p className="text-cream/70 max-w-xl leading-relaxed">
              Every kitchen sources halal-certified meat and prepares it with dedicated equipment
              and procedures — no shortcuts, no substitutions.
            </p>
          </div>
        </div>
      </section>

      {/* OUR CRAFT — decorative ambiance imagery (stock, CC0), not tied to specific menu items */}
      <section className="px-5 md:px-8 py-20 border-t border-cream/10">
        <div className="max-w-6xl mx-auto">
          <p className="section-label mb-2 text-center">How We Do It</p>
          <h2 className="font-serif font-bold text-3xl md:text-4xl text-cream text-center mb-12">Made fresh, the right way</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {[
              { src: STOCK.doughPrep, caption: 'Hand-stretched dough, daily' },
              { src: STOCK.cheeseCloseup, caption: 'Melted to perfection' },
              { src: STOCK.freshVeg, caption: 'Fresh-cut ingredients' },
              { src: STOCK.cheeseburger, caption: 'Smash burgers, done right' },
            ].map((tile) => (
              <div
                key={tile.caption}
                className="menu-card relative aspect-square rounded-2xl overflow-hidden bg-cream/[0.04] border border-cream/10"
              >
                <Image src={tile.src} alt={tile.caption} fill className="menu-media object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-3">
                  <p className="text-cream text-xs font-semibold">{tile.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCATIONS */}
      <section id="locations" className="px-5 md:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <p className="section-label mb-2 text-center">Where to Find Us</p>
          <h2 className="font-serif font-bold text-3xl md:text-4xl text-cream text-center mb-12">Two Michigan kitchens</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { name: 'Madison Heights', address: '28931 John R Rd, Madison Heights, MI 48071', status: 'Now Taking Orders', live: true },
              { name: 'Warren', address: '8113 E 9 Mile Rd, Warren, MI 48089', status: 'Opening Soon', live: false },
            ].map((loc) => (
              <div key={loc.name} className="menu-card rounded-2xl border border-cream/10 bg-cream/[0.03] p-7 hover:border-gold/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif font-semibold text-xl text-cream">{loc.name}</h3>
                  <span className={`text-[11px] font-bold uppercase tracking-wide rounded-full px-3 py-1 ${loc.live ? 'bg-gold/15 text-gold' : 'bg-cream/10 text-cream/60'}`}>
                    {loc.status}
                  </span>
                </div>
                <p className="text-cream/60 text-sm">{loc.address}</p>
                {loc.live && (
                  <Link href="/menu" className="btn-primary mt-5 inline-flex">Order from this kitchen</Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="px-5 md:px-8 py-16 border-t border-cream/10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center gap-1 text-gold text-xl mb-4">
            {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
          </div>
          <h2 className="font-serif font-bold text-2xl md:text-3xl text-cream">Loved across Madison Heights &amp; Warren</h2>
          <p className="text-cream/55 mt-3">Join the neighbors who order from us every week.</p>
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
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-3">
                    <p className="text-cream text-xs font-semibold truncate">{displayName(g.name)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED IN THE NEWS (placeholder) */}
      <section className="px-5 md:px-8 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-label mb-2">As Seen In</p>
          <h2 className="font-serif font-bold text-2xl md:text-3xl text-cream mb-8">Featured in the news</h2>
          <div className="aspect-video rounded-2xl border border-cream/10 bg-cream/[0.03] flex items-center justify-center">
            <p className="text-cream/40 text-sm">News coverage coming soon</p>
          </div>
        </div>
      </section>
    </>
  );
}
