'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { useLocation } from '@/lib/location';

// Owner-managed promotion banners (dashboard → Promotions). Nothing about any
// specific offer lives in code: title, text, button, image, design, end-date
// display, placements, dates, hours and store all come from mimis.promotions
// through the public live_promotion_banners() RPC, which only returns banners
// while the promotion is live AND promotions are switched on at checkout. The
// banner advertises; the discount itself is decided only by checkout on the
// server.
//
// placement 'bar'   → components/PromoBar.jsx (scrolling bar under the header).
// placement 'home'  → a floating card that slides in once the visitor scrolls
//                     past the hero, bottom-left on desktop, under the
//                     header on phones — clear of the cart bar, the rewards
//                     card and the chat launcher, which own the bottom-right.
// placement 'menu' | 'cart' | 'checkout' → inline strip in the page flow.
//
// Every banner has a close button. A closed offer stays hidden on this device
// for DISMISS_DAYS (per offer, everywhere). With several live offers, each
// visit uses the owner's order setting (random or priority); inline strips rotate.

// Where the button goes. Only the home page has somewhere useful to send the
// customer (the menu). On the menu they are already there, and on cart /
// checkout the banner only confirms the offer — a button there would pull them
// out of the order they are placing.
const CTA_HREF = { home: '/menu', menu: null, cart: null, checkout: null };

export const BANNER_STYLES = ['minimal', 'pill', 'outline', 'coupon', 'soft', 'solid', 'dark', 'spotlight'];

const DISMISS_KEY = 'mimis_promo_dismissed_v1';
const DISMISS_DAYS = 3;
const FLOAT_DELAY_MS = 2500;
const ROTATE_MS = 8000;

// Browser storage can be missing or throw (private mode, blocked site data);
// banners must still work, they just won't remember a close.
function readDismissed() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(DISMISS_KEY) || '{}');
    const cutoff = Date.now() - DISMISS_DAYS * 86400000;
    return Object.fromEntries(Object.entries(raw).filter(([, t]) => Number(t) > cutoff));
  } catch { return {}; }
}
function saveDismissed(id) {
  try {
    const cur = readDismissed(); cur[id] = Date.now();
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(cur));
  } catch { /* not remembered; closed for this page view only */ }
}

// "Ends Sat, Oct 31, 11:59 PM" in store time, exactly as set in the dashboard.
function endsLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return 'Ends ' + d.toLocaleString('en-US', {
    timeZone: 'America/Detroit', weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// Owner setting (dashboard → Promotions → Banner settings): 'priority' keeps the
// server's order (highest priority first); 'random' shuffles once per page view
// so every live offer gets seen.
export function orderItems(items, rows) {
  const mode = rows[0]?.banner_order === 'priority' ? 'priority' : 'random';
  if (mode === 'priority' || items.length < 2) return items;
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export { readDismissed, saveDismissed, endsLabel };

function toView(row, placement) {
  const href = CTA_HREF[placement];
  return {
    id: row.promotion_id,
    style: BANNER_STYLES.includes(row.style) ? row.style : 'minimal',
    title: row.title,
    body: row.body,
    cta: row.cta && href ? { href, label: row.cta } : null,
    image: row.image_url && /^https:\/\//i.test(row.image_url) ? row.image_url : null,
    ends: row.show_end_date === false ? null : endsLabel(row.ends_at),
  };
}

export default function PromoBanner({ placement, className = '' }) {
  const { location } = useLocation();
  const [rows, setRows] = useState([]);
  const [dismissed, setDismissed] = useState({});

  useEffect(() => { setDismissed(readDismissed()); }, []);

  useEffect(() => {
    let cancelled = false;
    getSupabasePublicClient()
      .rpc('live_promotion_banners', { p_location: location, p_placement: placement })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error('live_promotion_banners', error.message); setRows([]); return; }
        setRows(Array.isArray(data) ? data : []);
      });
    return () => { cancelled = true; };
  }, [location, placement]);

  const dismiss = useCallback((id) => {
    saveDismissed(id);
    setDismissed((d) => ({ ...d, [id]: Date.now() }));
  }, []);

  const items = orderItems(rows.filter((r) => !dismissed[r.promotion_id]).map((r) => toView(r, placement)), rows);
  if (!items.length) return null;
  if (placement === 'home') return <FloatingPromo items={items} onDismiss={dismiss} />;
  return <InlinePromo items={items} onDismiss={dismiss} className={className} />;
}

// ---- inline strip (menu / cart / checkout) --------------------------------
function InlinePromo({ items, onDismiss, className }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [count, paused]);

  const b = items[idx % count];
  return (
    <div
      className={`max-w-6xl mx-auto px-5 md:px-8 my-4 ${className}`}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
    >
      <div key={b.id} className="relative animate-fade-in [&>*:first-child]:pr-11">
        <Styled style={b.style} b={b} />
        <CloseButton onClick={() => onDismiss(b.id)} tone={TONE[b.style]} className="absolute right-2 top-1/2 -translate-y-1/2" />
      </div>
      {count > 1 && (
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
          {items.map((x, i) => (
            <span key={x.id} className={`h-1.5 rounded-full transition-all ${i === idx % count ? 'w-4 bg-highlight' : 'w-1.5 bg-app-tint'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- floating card (home) -------------------------------------------------
function FloatingPromo({ items, onDismiss }) {
  // One offer per visit: the first after ordering (random or by priority).
  const [b] = useState(() => items[0]);
  const [shown, setShown] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Appears only once the visitor has scrolled past the hero, so it never sits
  // on top of the hero's headline or its Order / Menu buttons. Short pages
  // (nothing to scroll past) show it after a pause instead.
  useEffect(() => {
    const show = () => setShown(true);
    const threshold = () => window.innerHeight * 0.8;
    const onScroll = () => { if (window.scrollY > threshold()) show(); };
    const t = setTimeout(() => {
      if (document.documentElement.scrollHeight <= window.innerHeight * 1.2) show();
    }, FLOAT_DELAY_MS);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
  }, []);

  const close = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(b.id), 250);
  }, [b.id, onDismiss]);

  useEffect(() => {
    if (!shown) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, close]);

  const visible = shown && !leaving;
  const pal = FLOAT_PALETTE[b.style] || FLOAT_PALETTE.minimal;

  return (
    <aside
      aria-label="Offer"
      aria-hidden={!visible}
      className={`fixed z-[90] left-3 right-3 md:right-auto md:left-5 md:w-[22rem]
        top-[calc(5rem+var(--promo-bar-h,0px)+env(safe-area-inset-top))] md:top-auto md:bottom-5
        transition-all duration-300 ease-out motion-reduce:transition-none
        ${visible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-3 md:translate-y-3'}`}
    >
      <div style={pal.border} className={`relative overflow-hidden rounded-app-lg shadow-2xl shadow-black/30 ${pal.box}`}>
        {b.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.image} alt="" className="h-28 w-full object-cover" loading="lazy" />
        )}
        <div className="flex flex-col gap-1.5 p-5 pr-12">
          {b.ends && <span className={`text-[11px] font-bold uppercase tracking-wider ${pal.ends}`}>{b.ends}</span>}
          <p className="font-serif text-xl font-bold leading-tight">{b.title}</p>
          {b.body && <p className={`text-sm ${pal.soft}`}>{b.body}</p>}
          {b.cta && (
            <div className="pt-2">
              <Link href={b.cta.href} onClick={() => onDismiss(b.id)} className={`inline-flex items-center rounded-full px-5 py-2 text-sm font-bold hover:opacity-90 ${pal.btn}`}>
                {b.cta.label} <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            </div>
          )}
        </div>
        <CloseButton onClick={close} tone={b.image ? 'image' : TONE[b.style]} className="absolute right-2.5 top-2.5" />
      </div>
    </aside>
  );
}

// Colours per design for the floating card. Borders are inline (see HL below).
const FLOAT_PALETTE = {
  minimal:   { box: 'bg-surface text-app border', border: { borderColor: 'color-mix(in srgb, var(--mimis-highlight) 40%, transparent)' }, soft: 'text-app-soft', ends: 'text-highlight', btn: 'bg-accent text-on-accent' },
  pill:      { box: 'bg-surface text-app', border: {}, soft: 'text-app-soft', ends: 'text-highlight', btn: 'bg-accent text-on-accent' },
  outline:   { box: 'bg-surface text-app border border-l-4', border: { borderColor: 'var(--mimis-line)', borderLeftColor: 'var(--mimis-highlight)' }, soft: 'text-app-soft', ends: 'text-highlight', btn: 'bg-accent text-on-accent' },
  coupon:    { box: 'bg-surface text-app border-2 border-dashed', border: { borderColor: 'var(--mimis-highlight)' }, soft: 'text-app-soft', ends: 'text-highlight', btn: 'bg-accent text-on-accent' },
  soft:      { box: 'bg-surface text-app border', border: { borderColor: 'color-mix(in srgb, var(--mimis-highlight) 40%, transparent)' }, soft: 'text-app-soft', ends: 'text-highlight', btn: 'bg-accent text-on-accent' },
  solid:     { box: 'bg-accent text-on-accent', border: {}, soft: 'opacity-90', ends: 'opacity-90', btn: 'bg-on-accent text-accent' },
  dark:      { box: 'bg-app text-surface', border: {}, soft: 'opacity-80', ends: 'text-highlight', btn: 'bg-highlight text-on-highlight' },
  spotlight: { box: 'bg-accent text-on-accent', border: {}, soft: 'opacity-90', ends: 'opacity-90', btn: 'bg-white text-[#1D2021]' },
};

// Colour of the close button on each design's background.
const TONE = { solid: 'onAccent', spotlight: 'onAccent', dark: 'onDark' };
const TONE_CLASS = {
  undefined: 'text-app-soft hover:bg-app-wash hover:text-app',
  onAccent: 'text-on-accent hover:bg-white/15',
  onDark: 'text-surface hover:bg-white/10',
  image: 'bg-black/45 text-white hover:bg-black/60',
};

function CloseButton({ onClick, tone, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close offer"
      className={`grid h-8 w-8 place-items-center rounded-full text-lg leading-none transition-colors ${TONE_CLASS[tone] || TONE_CLASS.undefined} ${className}`}
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}

function Styled({ style, b }) {
  switch (style) {
    case 'pill': return <Pill b={b} />;
    case 'outline': return <Outline b={b} />;
    case 'coupon': return <Coupon b={b} />;
    case 'soft': return <Soft b={b} />;
    case 'solid': return <Solid b={b} />;
    case 'dark': return <Dark b={b} />;
    case 'spotlight': return <Spotlight b={b} />;
    default: return <Minimal b={b} />;
  }
}

// ---- shared bits -----------------------------------------------------------
// Border colours are inline on purpose: the reference design's globals.css has
// `[data-design='reference'] * { border-color: var(--border) }`, which comes
// after Tailwind's utilities and silently wins over every border-* colour class.
const HL_LINE = { borderColor: 'color-mix(in srgb, var(--mimis-highlight) 40%, transparent)' };
const HL = { borderColor: 'var(--mimis-highlight)' };
const Thumb = ({ src, cls = 'h-9 w-9 rounded-md' }) =>
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`${cls} shrink-0 object-cover`} loading="lazy" />;

function TextLink({ cta, cls = 'text-app decoration-highlight' }) {
  if (!cta) return null;
  return (
    <Link href={cta.href} className={`shrink-0 text-sm font-semibold underline decoration-2 underline-offset-4 hover:opacity-80 ${cls}`}>
      {cta.label} <span aria-hidden="true">→</span>
    </Link>
  );
}

function Ends({ ends, cls = 'text-app-soft' }) {
  if (!ends) return null;
  return <span className={`text-xs font-medium whitespace-nowrap ${cls}`}>{ends}</span>;
}

// ---- 1. Minimal: one thin line --------------------------------------------
function Minimal({ b }) {
  return (
    <div style={HL_LINE} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-app border bg-highlight-wash px-4 py-2.5">
      {b.image ? <Thumb src={b.image} /> : <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-highlight" />}
      <p className="min-w-[12rem] flex-1 text-sm leading-snug text-app">
        <span className="font-semibold">{b.title}</span>
        {b.body && <span className="text-app-soft"> · {b.body}</span>}
      </p>
      <Ends ends={b.ends} />
      <TextLink cta={b.cta} />
    </div>
  );
}

// ---- 2. Pill: small centred capsule ----------------------------------------
function Pill({ b }) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full bg-highlight-tint px-5 py-2 text-center">
        <span className="text-sm font-semibold text-app">{b.title}</span>
        {b.body && <span className="hidden sm:inline text-sm text-app-soft">{b.body}</span>}
        <Ends ends={b.ends} />
        <TextLink cta={b.cta} />
      </div>
    </div>
  );
}

// ---- 3. Outline: accent bar on the left ------------------------------------
function Outline({ b }) {
  return (
    <div style={{ borderColor: 'var(--mimis-line)', borderLeftColor: 'var(--mimis-highlight)' }} className="flex flex-wrap items-center gap-4 rounded-app border border-l-4 bg-surface px-5 py-3.5">
      {b.image && <Thumb src={b.image} cls="h-12 w-12 rounded-app-sm" />}
      <div className="min-w-[12rem] flex-1">
        <p className="font-semibold text-app">{b.title}</p>
        {b.body && <p className="mt-0.5 text-sm text-app-soft">{b.body}</p>}
      </div>
      <div className="flex items-center gap-4">
        <Ends ends={b.ends} />
        <TextLink cta={b.cta} />
      </div>
    </div>
  );
}

// ---- 4. Coupon: dashed ticket ----------------------------------------------
function Coupon({ b }) {
  return (
    <div style={HL} className="relative flex flex-wrap items-center gap-4 rounded-app border-2 border-dashed bg-highlight-wash px-6 py-4">
      {/* ticket notches, cut out in the page background */}
      <span aria-hidden="true" className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[var(--mimis-bg)]" />
      <span aria-hidden="true" className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[var(--mimis-bg)]" />
      <div className="min-w-[12rem] flex-1">
        <p className="font-serif text-lg font-bold text-app">{b.title}</p>
        {b.body && <p className="text-sm text-app-soft">{b.body}</p>}
      </div>
      <div className="flex flex-col items-start sm:items-end gap-1">
        <Ends ends={b.ends} />
        <TextLink cta={b.cta} />
      </div>
    </div>
  );
}

// ---- 5. Soft card: bigger headline, optional image -------------------------
function Soft({ b }) {
  return (
    <div style={HL_LINE} className="flex flex-col sm:flex-row overflow-hidden rounded-app-lg bg-highlight-wash border">
      {b.image && <Thumb src={b.image} cls="w-full sm:w-56 h-40 sm:h-auto" />}
      <div className="flex flex-1 flex-col justify-center gap-2 px-6 py-5">
        {b.ends && <Ends ends={b.ends} cls="text-highlight uppercase tracking-wider" />}
        <p className="font-serif text-2xl font-bold leading-tight text-app">{b.title}</p>
        {b.body && <p className="text-app-soft">{b.body}</p>}
        {b.cta && <div className="pt-1"><Link href={b.cta.href} className="btn-primary">{b.cta.label}</Link></div>}
      </div>
    </div>
  );
}

// ---- 6. Solid: brand colour block ------------------------------------------
function Solid({ b }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-app bg-accent px-6 py-4 text-on-accent">
      {b.image && <Thumb src={b.image} cls="h-12 w-12 rounded-app-sm" />}
      <div className="min-w-[12rem] flex-1">
        <p className="text-lg font-bold">{b.title}</p>
        {b.body && <p className="text-sm opacity-90">{b.body}</p>}
      </div>
      <Ends ends={b.ends} cls="opacity-90" />
      {b.cta && (
        <Link href={b.cta.href} className="shrink-0 rounded-full bg-on-accent px-5 py-2 text-sm font-bold text-accent hover:opacity-90">
          {b.cta.label} →
        </Link>
      )}
    </div>
  );
}

// ---- 7. Dark: inverted, high contrast --------------------------------------
function Dark({ b }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-app bg-app px-6 py-4 text-surface">
      {b.image && <Thumb src={b.image} cls="h-12 w-12 rounded-app-sm" />}
      <div className="min-w-[12rem] flex-1">
        <p className="text-lg font-bold">
          <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full bg-highlight align-middle" />
          {b.title}
        </p>
        {b.body && <p className="text-sm opacity-80">{b.body}</p>}
      </div>
      <Ends ends={b.ends} cls="opacity-80" />
      <TextLink cta={b.cta} cls="text-surface decoration-highlight" />
    </div>
  );
}

// ---- 8. Spotlight: the prominent one ---------------------------------------
function Spotlight({ b }) {
  return (
    <div className="relative overflow-hidden rounded-app-lg bg-accent text-on-accent">
      {b.image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div aria-hidden="true" className="absolute inset-0 bg-scrim" />
        </>
      )}
      <div className={`relative flex flex-col gap-3 px-7 py-9 md:px-12 md:py-12 ${b.image ? 'text-white' : ''}`}>
        {b.ends && <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-90">{b.ends}</span>}
        <p className="max-w-3xl font-serif text-3xl font-bold leading-[1.05] md:text-5xl">{b.title}</p>
        {b.body && <p className="max-w-2xl text-base opacity-90 md:text-lg">{b.body}</p>}
        {b.cta && (
          <div className="pt-2">
            <Link href={b.cta.href} className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-bold text-[#1D2021] hover:opacity-90">
              {b.cta.label} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
