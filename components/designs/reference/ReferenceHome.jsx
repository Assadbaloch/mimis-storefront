import Link from 'next/link';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { getActiveLocation } from '@/lib/locationServer';
import { getStoreLocations } from '@/lib/storeLocations';
import { displayName } from '@/lib/format';
import ReferenceHero from './ReferenceHero';
import { ReferenceReviewCard, ReferencePressCarousel } from './ReferenceInteractive';
import OrderAtLocationLink from './OrderAtLocationLink';

// The reference home page, in Index.tsx order:
//   Hero, TrustSection, MenuSection, HalalSection, LocationsSection,
//   ReviewsSection, FeaturedNewsSection, RewardsSection.
// GallerySection exists in the reference but Index.tsx does not render it, so
// it is absent here too.
//
// ONE substitution: MenuSection's four hardcoded pizzas (with fixed $18.99-type
// prices) are replaced by live Clover items. Everything else -- copy, colours,
// spacing, hover behaviour -- is ported as-is. Locations and hours come from
// mimis.store_locations because that is the existing system of record.

const HERO_VIDEO =
  'https://igchqqyassrfpsliyjec.supabase.co/storage/v1/object/public/site-media/1787169541748-mimis_header.mp4';

const TRUST = [
  { label: 'SOURCING', title: '100% Zabiha Halal' },
  { label: 'INGREDIENTS', title: 'Fresh, Daily' },
  { label: 'FOOTPRINT', title: 'Two MI Locations' },
  { label: 'ORDERING', title: 'In Store, Online, Delivery & Pickup' },
];

const REVIEWS = [
  {
    text: "It's been some time since I visited this part of the city, but I'm glad I did. Their pizza is outstanding here! My favorite was the tandoori style—absolutely delicious. Plus, the service was warm and welcoming. Food: 5/5 | Service: 5/5 | Atmosphere: 5/5",
    initial: 'M', name: 'Mishty M', location: 'LOCAL GUIDE • 295 REVIEWS', source: 'GOOGLE',
    color: 'bg-[#174A91] text-white dark:bg-[#b41d24]',
  },
  {
    text: "Great Place Food Fresh And Great Taste.....I ordered the meat lovers and it was 🔥 also ordered the Hawaiian chicken pizza it was pretty tasty as well definitely will be returning 100% halal I love this about them!!! You see meat lovers is gone completely. Food: 5/5 | Service: 5/5 | Atmosphere: 5/5",
    initial: 'K', name: 'Kastrotha Don', location: '4 REVIEWS', source: 'GOOGLE',
    color: 'bg-[#0b4221] text-white',
  },
  {
    text: "Mimi's Pizza is hands down the best! The crust is perfectly crispy, the cheese is fresh, and every bite is packed with flavor. Best part? It's 100% zabiha halal, so I can enjoy it with peace of mind. The staff is friendly, service is fast, and the quality is top-notch. My new favorite pizza spot!",
    initial: 'S', name: 'Shuraim Ahmed', location: '1 REVIEW', source: 'GOOGLE',
    color: 'bg-[#C99700] text-white dark:bg-[#e6b95c] dark:text-[#0a0604]',
  },
];

const PRESS_SLIDES = [
  { type: 'video', src: 'https://www.youtube.com/embed/gNqAn9j1lu0', title: "Mimi's Pizza on Live in the D" },
  {
    type: 'article',
    href: 'https://www.clickondetroit.com/live-in-the-d/2025/09/09/pizzeria-serves-up-unique-options-in-madison-heights/',
    image: 'https://i.ytimg.com/vi/BWcGw3EjAnc/maxresdefault.jpg',
    title: 'Pizzeria serves up unique options in Madison Heights',
    caption: 'ClickOnDetroit • Live in the D',
  },
];

const LADDER = [
  { pts: '100 pts', reward: '$5 Off' },
  { pts: '200 pts', reward: '$12 Off' },
  { pts: '350 pts', reward: 'Free Large Pizza' },
  { pts: '500 pts', reward: 'Family Meal' },
];

// Featured items, priced live from Clover. with-image only: the reference's
// grid is photo-led, and Clover has whole categories with no photography.
async function getFeatured(location) {
  const supabase = getSupabasePublicClient();
  const { data } = await supabase
    .from('menu_items')
    // description_override is the only description column on menu_items --
    // there is no plain `description`; Clover's own text is not synced.
    .select('clover_item_id, name, image_url, badge_text, description_override')
    .eq('available', true)
    .eq('location', location)
    .eq('featured', true)
    .not('image_url', 'is', null)
    .order('sort_order', { ascending: true })
    .limit(4);
  return data || [];
}

export default async function ReferenceHome() {
  const location = await getActiveLocation();
  const [featured, locations] = await Promise.all([getFeatured(location), getStoreLocations()]);

  return (
    <>
      <ReferenceHero videoUrl={HERO_VIDEO} />

      {/* ---------------------------- TRUST ---------------------------- */}
      <section className="py-24 bg-[#C8102E] dark:bg-gradient-to-b dark:from-[#0a0604] dark:via-[#1a0f0a] dark:to-[#0a0604] border-y border-white/10 dark:border-white/5">
        <div className="container mx-auto px-8 md:px-16 lg:px-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {TRUST.map((f) => (
              <div key={f.label} className="flex flex-col pl-6 border-l-2 border-[#C99700] dark:border-[#e6b95c]/30">
                <h4 className="text-[10px] tracking-[0.2em] font-bold text-[#F3EFE4]/80 dark:text-[#e6b95c] uppercase mb-2">{f.label}</h4>
                <h3 className="text-xl md:text-2xl font-serif font-bold text-[#F3EFE4] dark:text-[#f5ebd7]">{f.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------ POPULAR THIS WEEK --------------------- */}
      {featured.length > 0 && (
        <section id="menu" className="py-32 bg-[#F3EFE4] dark:bg-gradient-to-b dark:from-[#0a0604] dark:via-[#1a0f0a] dark:to-[#0a0604]">
          <div className="container mx-auto px-8 md:px-16 lg:px-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div className="max-w-2xl">
                <div className="flex items-center gap-4 text-[10px] tracking-widest text-[#C99700] dark:text-[#e6b95c] font-bold uppercase mb-6">
                  <div className="w-8 h-px bg-[#C99700] dark:bg-[#e6b95c]" />
                  <span>THIS WEEK AT MIMI&rsquo;S</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-tight tracking-tight">
                  Popular <span className="italic text-[#C99700] dark:text-[#e6b95c]">this week.</span>
                </h2>
              </div>
              <Link
                href="/menu"
                className="rounded-full bg-[#FFF9EC] text-[#174A91] border-2 border-[#174A91] hover:bg-[#174A91] hover:text-white dark:bg-transparent dark:border-[#f5ebd7]/20 dark:text-[#f5ebd7] dark:hover:bg-white/5 px-6 h-12 inline-flex items-center text-xs font-bold tracking-widest self-start md:self-auto transition-all shadow-sm"
              >
                SEE FULL MENU &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((item) => (
                <Link
                  key={item.clover_item_id}
                  href={`/menu/${item.clover_item_id}`}
                  className="group relative flex flex-col rounded-xl overflow-hidden bg-[#FFF9EC] dark:bg-[#2a1a12] border border-[rgba(29,32,33,0.1)] dark:border-white/5 hover:border-[#C99700]/50 dark:hover:border-white/20 shadow-[0_12px_30px_rgba(29,32,33,0.06)] hover:shadow-[0_20px_40px_rgba(29,32,33,0.12)] hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300"
                >
                  <div className="relative aspect-square w-full bg-[#EAE4D5] dark:bg-[#1a0f0a]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={displayName(item.name)}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 dark:from-[#1f120c] via-transparent to-transparent opacity-80" />
                    {item.badge_text && (
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shadow-sm bg-[#C8102E]">
                        {item.badge_text}
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-grow flex flex-col justify-between bg-[#FFF9EC] dark:bg-[#1f120c]">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7]">{displayName(item.name)}</h3>
                      </div>
                      <p className="text-xs text-[#3D4041] dark:text-[#f5ebd7]/60 leading-relaxed">
                        {item.description_override || ''}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------- HALAL ---------------------------- */}
      <section className="pt-32 pb-24 bg-[#174A91] dark:bg-gradient-to-b dark:from-[#0a0604] dark:via-[#114022] dark:to-[#0a0604] relative overflow-hidden">
        <div className="container mx-auto px-8 md:px-16 lg:px-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/30 bg-white/10 dark:border-[#4ade80] dark:bg-transparent mb-8">
                <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
                <span className="text-white dark:text-[#4ade80] text-[10px] font-bold tracking-widest uppercase">100% ZABIHA HALAL • حلال</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-serif font-bold text-white dark:text-[#f5ebd7] mb-6 leading-tight tracking-tight">
                Halal isn&rsquo;t a label. <br />
                It&rsquo;s the <span className="italic text-[#E0AE00] dark:text-[#e6b95c]">whole kitchen.</span>
              </h2>
              <h3 className="text-2xl md:text-3xl font-bold font-serif text-[#E0AE00] dark:text-[#e6b95c] mb-4">Certified By HFSAA.</h3>
              <p className="text-base text-[#FFF9EC]/90 dark:text-[#f5ebd7]/90 mb-10 leading-relaxed max-w-lg font-medium">
                Every cut of beef, chicken, and pepperoni at MiMi&rsquo;s is certified 100% Zabiha Halal &mdash; verified at the source, separated from non-halal handling, and prepared in a kitchen built for families who don&rsquo;t compromise on faith or flavor.
              </p>
            </div>
            <div className="relative w-full aspect-square md:aspect-[4/5] lg:aspect-square flex items-center justify-center">
              <div className="absolute inset-0 bg-white/10 dark:bg-[#114022] blur-[80px] rounded-full opacity-80 scale-110" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hfsaa-badge.png"
                alt="HFSAA Certified Halal"
                className="absolute inset-0 w-full h-full object-contain p-8 md:p-16 z-10 drop-shadow-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- LOCATIONS -------------------------- */}
      <section id="locations" className="py-32 bg-[#EAE4D5]/40 dark:bg-gradient-to-b dark:from-[#0a0604] dark:via-[#1a0f0a] dark:to-[#0a0604] relative">
        <div className="container mx-auto px-6 md:px-12 lg:px-16 max-w-[1400px]">
          <div className="flex flex-col items-center text-center mb-24">
            <div className="flex items-center gap-4 text-[10px] tracking-widest text-[#C99700] dark:text-[#e6b95c] font-bold uppercase mb-8">
              <div className="w-8 h-px bg-[#C99700] dark:bg-[#e6b95c]" />
              <span>FIND US</span>
              <div className="w-8 h-px bg-[#C99700] dark:bg-[#e6b95c]" />
            </div>
            <h2 className="text-5xl md:text-7xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-tight tracking-tight max-w-3xl">
              Two Michigan kitchens. <br />
              <span className="italic text-[#C99700] dark:text-[#e6b95c]">One MiMi&rsquo;s promise.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl mx-auto">
            {locations.map((loc, i) => (
              <div
                key={loc.key}
                className="relative overflow-hidden rounded-2xl bg-[#FFF9EC] dark:bg-gradient-to-br dark:from-[#1a0f0a] dark:to-[#0a0604] border border-[rgba(29,32,33,0.1)] dark:border-[#e6b95c]/10 p-10 md:p-14 shadow-[0_12px_30px_rgba(29,32,33,0.06)] hover:shadow-[0_20px_40px_rgba(29,32,33,0.12)] hover:-translate-y-1 transition-all duration-500 group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#C99700]/5 dark:bg-[#e6b95c]/5 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-4 text-[10px] tracking-widest text-[#C99700] dark:text-[#e6b95c] font-bold uppercase mb-8">
                    <div className="w-8 h-px bg-[#C99700] dark:bg-[#e6b95c]" />
                    <span>LOCATION {String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="text-4xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] mb-8">{loc.name}</h3>
                  <div className="mb-12">
                    <p className="text-sm text-[#3D4041] dark:text-[#f5ebd7]/80 leading-relaxed font-medium">{loc.address}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-8 mb-12">
                    <div>
                      <span className="block text-[10px] tracking-widest text-[#C99700] dark:text-[#e6b95c] font-bold uppercase mb-2">STATUS</span>
                      <p className="text-sm font-bold text-[#1D2021] dark:text-[#f5ebd7]">{loc.status || 'Open'}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] tracking-widest text-[#C99700] dark:text-[#e6b95c] font-bold uppercase mb-2">PHONE</span>
                      {loc.phone && (
                        <a href={`tel:${loc.phone.replace(/[^\d+]/g, '')}`} className="text-sm font-bold text-[#1D2021] dark:text-[#f5ebd7] hover:text-[#C8102E] dark:hover:text-[#e6b95c]">
                          {loc.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {/* Sets the store before opening the menu -- the two
                        restaurants have different Clover menus. */}
                    <OrderAtLocationLink
                      location={loc.key}
                      className="bg-[#C8102E] hover:bg-[#A80D27] text-white dark:bg-[#b41d24] dark:hover:bg-[#9a181e] rounded-full text-xs font-bold h-12 px-8 inline-flex items-center shadow-sm transition-all cursor-pointer"
                    >
                      ORDER FROM {loc.name.toUpperCase()} &rarr;
                    </OrderAtLocationLink>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- REVIEWS --------------------------- */}
      <section id="reviews" className="py-32 bg-[#C8102E] dark:bg-gradient-to-b dark:from-[#0a0604] dark:via-[#1a0f0a] dark:to-[#0a0604]">
        <div className="container mx-auto px-8 md:px-16 lg:px-24">
          <div className="max-w-3xl mb-20">
            <div className="flex items-center gap-4 text-[10px] tracking-widest text-[#F3EFE4] dark:text-[#e6b95c] font-bold uppercase mb-8">
              <div className="w-8 h-px bg-[#C99700] dark:bg-[#e6b95c]" />
              <span>FROM MICHIGAN FAMILIES</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-serif font-bold text-[#F3EFE4] dark:text-[#f5ebd7] leading-tight tracking-tight">
              Top Rated Pizzeria in Greater Detroit &bull; <span className="italic text-[#F3EFE4] dark:text-[#e6b95c]">1,000+ 5-Star Reviews</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {REVIEWS.map((r) => <ReferenceReviewCard key={r.name} review={r} />)}
          </div>

          <div className="flex justify-center">
            <Link
              href="/reviews"
              className="rounded-full bg-transparent text-[#F3EFE4] border-2 border-[#F3EFE4] hover:bg-[#F3EFE4] hover:text-[#C8102E] dark:border-[#f5ebd7]/20 dark:text-[#f5ebd7] dark:hover:bg-white/5 h-12 px-8 inline-flex items-center text-xs font-bold tracking-widest transition-all shadow-sm"
            >
              READ MORE REVIEWS &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------- PRESS ---------------------------- */}
      <section className="py-32 bg-[#10396F] dark:bg-gradient-to-b dark:from-[#0a0604] dark:via-[#1a0f0a] dark:to-[#0a0604] overflow-hidden border-y border-[rgba(255,255,255,0.1)] dark:border-white/5">
        <div className="container mx-auto px-8 md:px-16 lg:px-24">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="flex items-center gap-4 text-[10px] tracking-widest text-[#E0AE00] dark:text-[#e6b95c] font-bold uppercase mb-8">
              <div className="w-8 h-px bg-[#E0AE00] dark:bg-[#e6b95c]" />
              <span>IN THE PRESS</span>
              <div className="w-8 h-px bg-[#E0AE00] dark:bg-[#e6b95c]" />
            </div>
            <h2 className="text-5xl md:text-7xl font-serif font-bold text-white dark:text-[#f5ebd7] leading-tight tracking-tight mb-6">
              Featured in the <span className="italic text-[#E0AE00] dark:text-[#e6b95c]">News</span>
            </h2>
            <p className="text-lg text-[#FFF9EC]/90 dark:text-[#f5ebd7]/80 max-w-2xl font-serif">
              We&rsquo;re proud to have been featured on Live in the D! Watch our story and see why Mimi&rsquo;s Pizza is making headlines in Metro Detroit.
            </p>
          </div>
          <ReferencePressCarousel slides={PRESS_SLIDES} />
        </div>
      </section>

      {/* ---------------------------- REWARDS --------------------------- */}
      <section id="rewards" className="py-32 bg-[#C8102E] dark:bg-gradient-to-b dark:from-[#0a0604] dark:via-[#1a080a] dark:to-[#2a0e11] relative overflow-hidden">
        <div className="container mx-auto px-8 md:px-16 lg:px-24 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            <div className="w-full lg:w-1/2">
              <div className="flex items-center gap-4 text-[10px] tracking-widest text-[#E0AE00] dark:text-[#e6b95c] font-bold uppercase mb-8">
                <div className="w-8 h-px bg-[#E0AE00] dark:bg-[#e6b95c]" />
                <span>MIMI&rsquo;S ONLINE REWARDS</span>
              </div>
              <h2 className="text-5xl md:text-7xl font-serif font-bold text-white dark:text-[#f5ebd7] leading-tight tracking-tight mb-8">
                Eat pizza.<br />
                Earn points.<br />
                <span className="italic text-[#E0AE00] dark:text-[#e6b95c]">Get rewards.</span>
              </h2>
              <p className="text-[#FFF9EC]/90 dark:text-[#f5ebd7]/80 text-lg leading-relaxed max-w-md mb-10 font-medium">
                Join free and we&rsquo;ll drop 50 bonus points in your account on day one. Hit 100 points and pick up a $5 reward &mdash; toward your next box.
              </p>
              <Link
                href="/rewards"
                className="bg-[#FFF9EC] hover:bg-[#EAE4D5] text-[#C8102E] dark:bg-[#e6b95c] dark:hover:bg-[#d4a84b] dark:text-[#0a0604] rounded-full text-sm font-bold h-14 px-10 inline-flex items-center shadow-md transition-all"
              >
                JOIN MIMI&rsquo;S REWARDS &rarr;
              </Link>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="bg-[#FFF9EC] dark:bg-[#1a0f0a] rounded-2xl p-10 md:p-14 border border-black/10 dark:border-[#e6b95c]/20 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#C99700]/5 dark:bg-[#e6b95c]/5 rounded-full blur-3xl" />
                <div className="flex items-center justify-between text-[10px] tracking-widest text-[#C99700] dark:text-[#e6b95c] font-bold uppercase mb-12 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-px bg-[#C99700] dark:bg-[#e6b95c]" />
                    <span>REWARD LADDER</span>
                  </div>
                  <span>1 POINT = $1 SPENT</span>
                </div>
                <div className="space-y-8 relative z-10">
                  {LADDER.map((tier, i) => (
                    <div
                      key={tier.pts}
                      className={`flex justify-between items-end ${i < LADDER.length - 1 ? 'border-b border-[rgba(29,32,33,0.1)] dark:border-white/5 pb-4' : ''}`}
                    >
                      <span className="text-2xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7]">{tier.pts}</span>
                      <span className="text-sm font-bold text-[#C8102E] dark:text-[#e6b95c]">{tier.reward}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
