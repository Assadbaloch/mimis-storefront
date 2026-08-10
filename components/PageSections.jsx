import Link from 'next/link';
import { formatPrice, displayCategory, displayName } from '@/lib/format';
import { normalizeEmbeds, toEmbedUrl, isVideoFile } from '@/lib/embed';
import SectionSlideshow from '@/components/SectionSlideshow';
import MenuItemCard from '@/components/MenuItemCard';

// Renders a CMS page's sections. Server component: menu data is fetched once
// on the server per page render, so a page with several menu sections still
// makes a single database round trip rather than one per section.
//
// Every section renderer is defensive about missing config -- staff can add a
// section and save before filling it in, and a half-filled section must degrade
// quietly rather than crash the whole page.

export default function PageSections({ sections, menuItems = [], storeLocations = [], homeData = {} }) {
  return (
    <>
      {sections.map((section) => (
        <Section key={section.id} section={section} menuItems={menuItems}
          storeLocations={storeLocations} homeData={{ ...homeData, menuItems }} />
      ))}
    </>
  );
}

function Section({ section, menuItems, storeLocations, homeData }) {
  const c = section.config || {};
  switch (section.type) {
    case 'hero': return <Hero c={c} homeData={homeData} />;
    case 'text': return <TextBlock c={c} />;
    case 'media_text': return <MediaText c={c} />;
    case 'locations': return <LocationsBlock c={c} storeLocations={storeLocations} />;
    case 'featured_items': return <FeaturedItems c={c} homeData={homeData} />;
    case 'menu_media': return <MenuMedia c={c} homeData={homeData} />;
    case 'news_strip': return <NewsStrip c={c} homeData={homeData} />;
    case 'image': return <ImageBlock c={c} />;
    case 'video': return <VideoBlock c={c} />;
    case 'gallery': return <Gallery c={c} />;
    case 'slideshow': return (
      <SectionSlideshow
        images={Array.isArray(c.images) ? c.images : []}
        headline={c.headline || ''}
        autoplay={c.autoplay === true}
        interval={c.interval}
        rounded={c.rounded !== false}
      />
    );
    case 'product_category': return <ProductGrid c={c} items={filterByCategory(menuItems, c)} />;
    case 'product_showcase': return <ProductGrid c={c} items={filterByIds(menuItems, c)} />;
    case 'cta_banner': return <CtaBanner c={c} />;
    case 'app_download': return <AppDownload c={c} />;
    case 'button': return <ButtonBlock c={c} />;
    case 'instagram': return <InstagramBlock c={c} />;
    case 'spacer': return <Spacer c={c} />;
    case 'custom_code': return <CustomCode c={c} id={section.id} />;
    default: return null;
  }
}

/* ---------------------------------------------------------------- helpers */

function filterByCategory(menuItems, c) {
  const wanted = (c.category || '').trim().toLowerCase();
  let list = menuItems.filter((i) => (i.category || '').trim().toLowerCase() === wanted);
  const limit = Number(c.limit);
  if (limit > 0) list = list.slice(0, limit);
  return list;
}

function filterByIds(menuItems, c) {
  const ids = Array.isArray(c.item_ids) ? c.item_ids : [];
  // Preserve the order staff arranged them in, rather than menu order.
  return ids.map((id) => menuItems.find((i) => i.id === id)).filter(Boolean);
}

function colsClass(n) {
  return { '2': 'sm:grid-cols-2', '3': 'sm:grid-cols-2 lg:grid-cols-3', '4': 'sm:grid-cols-2 lg:grid-cols-4' }[String(n)] || 'sm:grid-cols-2 lg:grid-cols-3';
}

const isVideo = isVideoFile;

/* ----------------------------------------------------------------- blocks */

function Hero({ c, homeData = {} }) {
  const heights = { short: 'min-h-[45vh]', medium: 'min-h-[65vh]', tall: 'min-h-[80vh]', 'full screen': 'min-h-screen' };
  const aligns = { left: 'items-start text-left', center: 'items-center text-center', right: 'items-end text-right' };
  // With no background chosen, fall back to the newest real menu photo/video --
  // the same behaviour the hardcoded hero had, so the seeded home page doesn't
  // suddenly lose its backdrop. Setting one in the builder overrides this.
  const autoBg = homeData.gallery?.[0];
  const bg = c.background || autoBg?.video_url || autoBg?.image_url || '';
  const overlay = Number(c.overlay ?? 45) / 100;

  return (
    <section className={`relative w-full flex ${heights[c.height] || heights.medium} overflow-hidden`}>
      {bg && (isVideo(bg) ? (
        <video className="absolute inset-0 w-full h-full object-cover" src={bg} autoPlay muted loop playsInline />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="absolute inset-0 w-full h-full object-cover" src={bg} alt="" />
      ))}
      <div className="absolute inset-0 bg-ink" style={{ opacity: bg ? overlay : 1 }} />
      <div className={`relative z-10 w-full max-w-4xl mx-auto px-5 py-20 flex flex-col justify-center ${aligns[c.align] || aligns.center}`}>
        {c.eyebrow && <p className="section-label mb-3 text-gold">{c.eyebrow}</p>}
        {c.headline && <h1 className="font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-cream leading-tight">{c.headline}</h1>}
        {c.subtext && <p className="text-cream/70 text-lg mt-5 max-w-2xl whitespace-pre-line">{c.subtext}</p>}
        {c.button_label && c.button_url && (
          <Link href={c.button_url} className="btn-primary mt-8 inline-flex">{c.button_label}</Link>
        )}
      </div>
    </section>
  );
}

/* Shared presentation helpers, so every block offers the same vocabulary of
   size / alignment / background rather than each inventing its own. */

const HEADLINE_SIZE = {
  small: 'text-xl md:text-2xl',
  medium: 'text-3xl md:text-4xl',
  large: 'text-4xl md:text-5xl',
  'extra large': 'text-5xl md:text-6xl',
};
const BODY_SIZE = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
  'extra large': 'text-xl',
};
const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };
const WIDTH = { narrow: 'max-w-2xl', wide: 'max-w-4xl', full: 'max-w-6xl' };

// Backgrounds reuse the same solid colour bands as the built-in home sections
// (see .band-* in globals.css). Each band sets its own foreground colour, so
// text stays readable whichever background is chosen -- the failure mode that
// made the old halal section unreadable when the palette changed.
const BACKGROUND = {
  none: '',
  blue: 'band-solid band-blue',
  red: 'band-solid band-red',
  yellow: 'band-solid band-yellow',
  dark: 'band-solid band-ink',
};

function bandClass(c) {
  return BACKGROUND[c.background] ?? '';
}
// On a coloured band everything inherits the band's foreground; off it, the
// normal themed text tokens apply.
function headingColour(c) {
  return bandClass(c) ? '' : 'text-app';
}
function bodyColour(c) {
  return bandClass(c) ? 'band-lede' : 'text-app-soft';
}

function TextBlock({ c }) {
  const width = WIDTH[c.width] || WIDTH.narrow;
  const align = ALIGN[c.align] || ALIGN.center;
  const band = bandClass(c);
  const inner = (
    <div className={`${width} mx-auto ${align}`}>
      {c.headline && (
        <h2 className={`font-serif font-bold ${HEADLINE_SIZE[c.size] || HEADLINE_SIZE.medium} ${headingColour(c)} mb-4`}>
          {c.headline}
        </h2>
      )}
      {c.body && (
        <p className={`${BODY_SIZE[c.size] || BODY_SIZE.medium} ${bodyColour(c)} leading-relaxed whitespace-pre-line`}>
          {c.body}
        </p>
      )}
    </div>
  );
  return <section className={`px-5 py-14 ${band}`}>{inner}</section>;
}

function MediaText({ c }) {
  const embed = c.embed_url ? toEmbedUrl(c.embed_url) : null;
  const media = c.media || '';
  const hasMedia = Boolean(embed || media);
  const band = bandClass(c);
  const align = ALIGN[c.align] || ALIGN.left;
  // Media first in the DOM only when it should sit on the left at desktop;
  // on mobile it always stacks above the copy, which reads better than text
  // floating above an unseen video.
  const mediaLeft = c.media_side === 'left';

  const mediaEl = !hasMedia ? null : (
    <div className="w-full rounded-app-lg overflow-hidden bg-app-wash">
      {embed ? (
        <div className="relative w-full aspect-video">
          <iframe src={embed} title={c.headline || 'Video'} className="absolute inset-0 w-full h-full" allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
        </div>
      ) : isVideo(media) ? (
        <video src={media} className="w-full h-auto" controls playsInline preload="metadata" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media} alt={c.headline || ''} className="w-full h-auto" />
      )}
    </div>
  );

  const copyEl = (
    <div className={align}>
      {c.eyebrow && <p className="section-label mb-3">{c.eyebrow}</p>}
      {c.headline && (
        <h2 className={`font-serif font-bold ${HEADLINE_SIZE[c.size] || HEADLINE_SIZE.medium} ${headingColour(c)} mb-4`}>
          {c.headline}
        </h2>
      )}
      {c.body && (
        <p className={`${BODY_SIZE[c.size] || BODY_SIZE.medium} ${bodyColour(c)} leading-relaxed whitespace-pre-line`}>
          {c.body}
        </p>
      )}
      {c.button_label && c.button_url && (
        <Link href={c.button_url} className="btn-primary mt-6 inline-flex">{c.button_label}</Link>
      )}
    </div>
  );

  return (
    <section className={`px-5 py-14 ${band}`}>
      <div className={`max-w-6xl mx-auto grid gap-8 md:gap-12 items-center ${hasMedia ? 'md:grid-cols-2' : ''}`}>
        {hasMedia && mediaLeft && <div className="order-1">{mediaEl}</div>}
        <div className={hasMedia && mediaLeft ? 'order-2' : 'order-2 md:order-1'}>{copyEl}</div>
        {hasMedia && !mediaLeft && <div className="order-1 md:order-2">{mediaEl}</div>}
      </div>
    </section>
  );
}

/* The three data-driven home blocks. Each keeps pulling live data (Clover
   items, uploaded menu photos, press clips) AND accepts owner additions on
   top -- deliberately not an either/or, so a block can't quietly go stale the
   way a purely hand-picked list would. */

function FeaturedItems({ c, homeData }) {
  const auto = homeData.featured || [];
  const picked = Array.isArray(c.extra_item_ids) ? c.extra_item_ids : [];
  const extras = picked
    .map((id) => (homeData.menuItems || []).find((i) => i.id === id || i.clover_item_id === id))
    .filter(Boolean);
  // Owner picks lead, then whatever is flagged Featured, de-duplicated.
  const seen = new Set();
  const items = [...extras, ...auto]
    .filter((i) => i && !seen.has(i.clover_item_id) && seen.add(i.clover_item_id))
    .slice(0, Number(c.limit) > 0 ? Number(c.limit) : 4);

  if (!items.length) return null;
  const cols = { '2': 'grid-cols-2', '3': 'grid-cols-2 md:grid-cols-3', '4': 'grid-cols-2 md:grid-cols-4' }[String(c.columns)] || 'grid-cols-2 md:grid-cols-4';

  return (
    <section className="px-5 md:px-8 pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            {c.eyebrow && <p className="section-label mb-2">{c.eyebrow}</p>}
            {c.headline && <h2 className="font-serif font-bold text-3xl md:text-4xl text-app">{c.headline}</h2>}
          </div>
          {c.link_label && c.link_url && (
            <Link href={c.link_url} className="nav-link hidden sm:inline shrink-0">{c.link_label}</Link>
          )}
        </div>
        <div className={`grid ${cols} gap-4 md:gap-5`}>
          {items.map((item) => <MenuItemCard key={item.clover_item_id} item={item} />)}
        </div>
      </div>
    </section>
  );
}

function MenuMedia({ c, homeData }) {
  const extras = (Array.isArray(c.extra_images) ? c.extra_images : [])
    .filter(Boolean)
    .map((url, i) => ({ clover_item_id: `extra-${i}`, name: '', image_url: isVideo(url) ? null : url, video_url: isVideo(url) ? url : null, category: '' }));

  let auto = [];
  if (c.source === 'latest menu photos') auto = homeData.gallery || [];
  else if (c.source === 'only my own pictures') auto = [];
  else auto = homeData.showcase || [];

  const items = [...extras, ...auto].slice(0, Number(c.limit) > 0 ? Number(c.limit) : 8);
  if (!items.length) return null;

  const cols = { '2': 'grid-cols-2', '3': 'grid-cols-2 md:grid-cols-3', '4': 'grid-cols-2 md:grid-cols-4' }[String(c.columns)] || 'grid-cols-2 md:grid-cols-4';

  return (
    <section className="px-5 md:px-8 py-20 border-t border-line">
      <div className="max-w-6xl mx-auto">
        {c.eyebrow && <p className="section-label mb-2 text-center">{c.eyebrow}</p>}
        {c.headline && <h2 className="font-serif font-bold text-3xl md:text-4xl text-app text-center mb-12">{c.headline}</h2>}
        <div className={`grid ${cols} gap-4 md:gap-5`}>
          {items.map((item, i) => (
            <Link
              key={`${item.clover_item_id}-${i}`}
              href="/menu"
              className="menu-card relative aspect-square rounded-app-lg overflow-hidden bg-app-wash border border-line block"
            >
              {item.video_url ? (
                <video src={item.video_url} autoPlay muted loop playsInline className="menu-media absolute inset-0 w-full h-full object-cover" />
              ) : item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt={item.category || item.name || ''} className="menu-media absolute inset-0 w-full h-full object-cover" />
              ) : null}
              {(item.category || item.name) && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-scrim to-transparent p-3">
                  <p className="text-white text-xs font-semibold truncate">{item.category ? displayCategory(item.category) : displayName(item.name)}</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsStrip({ c, homeData }) {
  const extras = (Array.isArray(c.extra_images) ? c.extra_images : [])
    .filter(Boolean)
    .map((url, i) => ({ id: `extra-${i}`, media_type: isVideo(url) ? 'video' : 'image', url, caption: '' }));
  const clips = [...(homeData.newsMedia || []), ...extras];

  return (
    <section className="px-5 md:px-8 py-20 border-t border-line">
      <div className="max-w-6xl mx-auto text-center">
        {c.headline && <h2 className="font-serif font-bold text-2xl md:text-3xl text-app mb-8">{c.headline}</h2>}
        {clips.length === 0 ? (
          <div className="max-w-3xl mx-auto aspect-video rounded-app-lg border border-line bg-surface flex items-center justify-center">
            <p className="text-app-soft text-sm">{c.empty_text || 'News coverage coming soon'}</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 -mx-5 px-5 md:-mx-8 md:px-8">
            {clips.map((n) => (
              <div key={n.id} className="relative shrink-0 w-[280px] md:w-[340px] aspect-video rounded-app-lg overflow-hidden border border-line bg-app-wash snap-start">
                {n.media_type === 'video' ? (
                  <video src={n.url} className="absolute inset-0 w-full h-full object-cover" controls playsInline preload="metadata" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.url} alt={n.caption || ''} className="absolute inset-0 w-full h-full object-cover" />
                )}
                {n.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-scrim to-transparent p-3 text-left">
                    <p className="text-white text-xs font-semibold">{n.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LocationsBlock({ c, storeLocations = [] }) {
  if (!storeLocations.length) return null;
  return (
    <section id="locations" className="px-5 md:px-8 py-20">
      <div className="max-w-6xl mx-auto">
        {c.eyebrow && <p className="section-label mb-2 text-center">{c.eyebrow}</p>}
        {c.headline && (
          <h2 className="font-serif font-bold text-3xl md:text-4xl text-app text-center mb-12">{c.headline}</h2>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          {storeLocations.map((loc) => (
            <div key={loc.key} className="menu-card rounded-app-lg border border-line bg-surface p-7">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="font-serif font-semibold text-xl text-app">{loc.name}</h3>
                {loc.status && (
                  <span className={`text-[11px] font-bold uppercase tracking-wide rounded-full px-3 py-1 shrink-0 ${loc.live ? 'bg-highlight-tint text-highlight' : 'bg-app-wash text-app-soft'}`}>
                    {loc.status}
                  </span>
                )}
              </div>
              <p className="text-app-soft text-sm">{loc.address}</p>
              {loc.phone && (
                <a href={`tel:${loc.phone.replace(/[^\d+]/g, '')}`} className="text-app-soft text-sm hover:text-highlight mt-1 inline-block">
                  {loc.phone}
                </a>
              )}
              {c.show_order_button !== false && loc.live && (
                <Link href="/menu" className="btn-primary mt-5 inline-flex">Order from this kitchen</Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ImageBlock({ c }) {
  if (!c.image) return null;
  const rounded = c.rounded === false ? '' : 'rounded-2xl';
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={c.image} alt={c.caption || ''} className={`w-full h-auto ${rounded}`} />
  );
  return (
    <section className={c.width === 'full width' ? 'w-full' : 'max-w-4xl mx-auto px-5 py-10'}>
      {c.link_url ? <Link href={c.link_url}>{img}</Link> : img}
      {c.caption && <p className="text-cream/50 text-sm mt-3 text-center">{c.caption}</p>}
    </section>
  );
}

function VideoBlock({ c }) {
  const embed = (c.embed_url || '').trim();
  if (embed) {
    const src = toEmbedUrl(embed);
    if (!src) return null;
    return (
      <section className="max-w-4xl mx-auto px-5 py-10">
        <div className="relative w-full rounded-2xl overflow-hidden" style={{ paddingTop: '56.25%' }}>
          <iframe src={src} title="Video" className="absolute inset-0 w-full h-full" allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
        </div>
      </section>
    );
  }
  if (!c.video) return null;
  return (
    <section className="max-w-4xl mx-auto px-5 py-10">
      <video className="w-full rounded-2xl" src={c.video} poster={c.poster || undefined}
        controls autoPlay={!!c.autoplay} muted={!!c.autoplay} loop={!!c.loop} playsInline />
    </section>
  );
}

function Gallery({ c }) {
  const images = Array.isArray(c.images) ? c.images : [];
  if (!images.length) return null;
  return (
    <section className="max-w-5xl mx-auto px-5 py-12">
      {c.headline && <h2 className="font-serif font-bold text-3xl text-cream mb-6 text-center">{c.headline}</h2>}
      <div className={`grid grid-cols-1 ${colsClass(c.columns)} gap-4`}>
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" className="w-full h-56 object-cover rounded-xl" />
        ))}
      </div>
    </section>
  );
}

function ProductGrid({ c, items }) {
  if (!items.length) return null;
  return (
    <section className="max-w-6xl mx-auto px-5 py-14">
      {c.headline && <h2 className="font-serif font-bold text-3xl text-cream mb-2 text-center">{c.headline}</h2>}
      {c.subtext && <p className="text-cream/60 text-center mb-8 max-w-2xl mx-auto whitespace-pre-line">{c.subtext}</p>}
      <div className={`grid grid-cols-1 ${colsClass(c.columns)} gap-5`}>
        {items.map((item) => (
          <Link key={item.id} href={`/menu?item=${item.id}`}
            className="rounded-2xl border border-cream/10 bg-cream/[0.03] overflow-hidden hover:border-gold/40 transition">
            {item.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image_url} alt={item.name} className="w-full h-44 object-cover" />
            )}
            <div className="p-4">
              <h3 className="font-serif font-semibold text-lg text-cream">{item.name}</h3>
              {item.description && <p className="text-cream/55 text-sm mt-1 line-clamp-2">{item.description}</p>}
              <div className="flex items-center justify-between mt-3">
                {c.show_price !== false && <span className="text-gold font-semibold">{formatPrice(item.price_cents)}</span>}
                <span className="text-cream/70 text-sm">{c.button_label || 'Order Now'} &rarr;</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CtaBanner({ c }) {
  const styles = {
    gold: 'bg-gold text-ink',
    dark: 'bg-cream/[0.05] text-cream border border-cream/10',
    outlined: 'border border-gold/40 text-cream',
  };
  return (
    <section className="max-w-5xl mx-auto px-5 py-10">
      <div className={`rounded-2xl px-8 py-10 text-center ${styles[c.style] || styles.gold}`}>
        <h2 className="font-serif font-bold text-2xl sm:text-3xl">{c.headline}</h2>
        {c.subtext && <p className="mt-2 opacity-80">{c.subtext}</p>}
        {c.button_label && c.button_url && (
          <Link href={c.button_url}
            className={`inline-flex mt-6 px-6 py-3 rounded-full font-semibold ${c.style === 'gold' ? 'bg-ink text-cream' : 'bg-gold text-ink'}`}>
            {c.button_label}
          </Link>
        )}
      </div>
    </section>
  );
}

function AppDownload({ c }) {
  return (
    <section className="max-w-5xl mx-auto px-5 py-14">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          {c.headline && <h2 className="font-serif font-bold text-3xl text-cream mb-3">{c.headline}</h2>}
          {c.subtext && <p className="text-cream/65 mb-6 whitespace-pre-line">{c.subtext}</p>}
          <div className="flex gap-3 flex-wrap">
            {c.ios_url && <a href={c.ios_url} target="_blank" rel="noreferrer" className="btn-primary">App Store</a>}
            {c.android_url && <a href={c.android_url} target="_blank" rel="noreferrer" className="btn-primary">Google Play</a>}
          </div>
        </div>
        {c.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.image} alt="" className="w-full h-auto rounded-2xl" />
        )}
      </div>
    </section>
  );
}

function ButtonBlock({ c }) {
  const align = { left: 'justify-start', center: 'justify-center', right: 'justify-end' }[c.align] || 'justify-center';
  if (!c.label || !c.url) return null;
  return (
    <section className={`max-w-4xl mx-auto px-5 py-8 flex ${align}`}>
      <Link href={c.url}
        className={c.style === 'outline'
          ? 'inline-flex px-6 py-3 rounded-full border border-gold/50 text-cream font-semibold'
          : 'btn-primary'}>
        {c.label}
      </Link>
    </section>
  );
}

function InstagramBlock({ c }) {
  if (!c.profile_url) return null;
  return (
    <section className="max-w-4xl mx-auto px-5 py-12 text-center">
      {c.headline && <h2 className="font-serif font-bold text-3xl text-cream mb-3">{c.headline}</h2>}
      <a href={c.profile_url} target="_blank" rel="noreferrer" className="text-gold text-lg">
        {c.handle || 'Follow us on Instagram'} &rarr;
      </a>
    </section>
  );
}

function Spacer({ c }) {
  const h = { small: 'h-8', medium: 'h-16', large: 'h-28' }[c.size] || 'h-16';
  return <div className={h} />;
}

// Custom HTML/CSS escape hatch. The CSS is scoped to this section's own
// wrapper id so a stray selector in one block can't restyle the whole site.
//
// SECURITY NOTE: this renders unsanitised HTML by design -- that's the point of
// the block. It is only writable by signed-in staff/owner (enforced by RLS on
// mimis.page_sections), so the trust boundary is the same as handing someone
// FTP access to the site. It is NOT safe to ever expose this editor to
// customers or unauthenticated users.
function CustomCode({ c, id }) {
  if (!c.html) return null;
  const scopeId = `sec-${id}`;
  const scopedCss = c.css ? scopeCss(c.css, `#${scopeId}`) : '';
  // normalizeEmbeds rewrites pasted YouTube/Vimeo links (and bare media URLs)
  // into working embeds -- a raw watch?v= URL in an iframe renders as a blank
  // box, which staff have no way to diagnose.
  const html = normalizeEmbeds(c.html);
  return (
    <section id={scopeId} className={c.full_width === false ? 'max-w-4xl mx-auto px-5 py-10' : 'w-full'}>
      {scopedCss && <style dangerouslySetInnerHTML={{ __html: scopedCss }} />}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

// Prefixes each top-level selector with the section scope. Deliberately simple:
// it handles the flat rules people actually paste. @media / @keyframes blocks
// are passed through untouched rather than mangled by a naive regex.
function scopeCss(css, scope) {
  return css.replace(/(^|\})\s*([^{}@]+)\s*\{/g, (match, brace, selectors) => {
    const scoped = selectors
      .split(',')
      .map((s) => {
        const sel = s.trim();
        if (!sel) return sel;
        if (/^(html|body)\b/i.test(sel)) return scope;
        return `${scope} ${sel}`;
      })
      .join(', ');
    return `${brace} ${scoped} {`;
  });
}
