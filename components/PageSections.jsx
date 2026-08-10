import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import { normalizeEmbeds, toEmbedUrl, isVideoFile } from '@/lib/embed';
import SectionSlideshow from '@/components/SectionSlideshow';

// Renders a CMS page's sections. Server component: menu data is fetched once
// on the server per page render, so a page with several menu sections still
// makes a single database round trip rather than one per section.
//
// Every section renderer is defensive about missing config -- staff can add a
// section and save before filling it in, and a half-filled section must degrade
// quietly rather than crash the whole page.

export default function PageSections({ sections, menuItems = [] }) {
  return (
    <>
      {sections.map((section) => (
        <Section key={section.id} section={section} menuItems={menuItems} />
      ))}
    </>
  );
}

function Section({ section, menuItems }) {
  const c = section.config || {};
  switch (section.type) {
    case 'hero': return <Hero c={c} />;
    case 'text': return <TextBlock c={c} />;
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

function Hero({ c }) {
  const heights = { short: 'min-h-[45vh]', medium: 'min-h-[65vh]', tall: 'min-h-[80vh]', 'full screen': 'min-h-screen' };
  const aligns = { left: 'items-start text-left', center: 'items-center text-center', right: 'items-end text-right' };
  const bg = c.background || '';
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

function TextBlock({ c }) {
  const width = c.width === 'wide' ? 'max-w-4xl' : 'max-w-2xl';
  const align = c.align === 'left' ? 'text-left' : 'text-center';
  return (
    <section className={`${width} mx-auto px-5 py-14 ${align}`}>
      {c.headline && <h2 className="font-serif font-bold text-3xl text-cream mb-4">{c.headline}</h2>}
      {c.body && <p className="text-cream/70 leading-relaxed whitespace-pre-line">{c.body}</p>}
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
