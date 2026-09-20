'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { useLocation } from '@/lib/location';

// Owner-managed promotion banner (dashboard → Promotions). Nothing about any
// specific offer lives in code: title, text, button, image, style, end-date
// display, placements, dates, hours and store all come from mimis.promotions
// through the public live_promotion_banners() RPC, which only returns a banner
// while its promotion is live AND promotions are switched on at checkout. The
// banner advertises; the discount itself is decided only by checkout on the
// server.
//
// placement: 'home' | 'menu' | 'cart' | 'checkout'
// bare:      render without the page-width container (e.g. inside the hero)

// Where the button goes. Only the home page has somewhere useful to send the
// customer (the menu). On the menu they are already there, and on cart /
// checkout the banner only confirms the offer — a button there would pull them
// out of the order they are placing.
const CTA_HREF = { home: '/menu', menu: null, cart: null, checkout: null };

export const BANNER_STYLES = ['minimal', 'pill', 'outline', 'coupon', 'soft', 'solid', 'dark', 'spotlight'];

// "Ends Fri, Oct 31, 11:59 PM" in store time, exactly as set in the dashboard.
function endsLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return 'Ends ' + d.toLocaleString('en-US', {
    timeZone: 'America/Detroit', weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function PromoBanner({ placement, className = '', bare = false }) {
  const { location } = useLocation();
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSupabasePublicClient()
      .rpc('live_promotion_banners', { p_location: location, p_placement: placement })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error('live_promotion_banners', error.message); setBanner(null); return; }
        setBanner(Array.isArray(data) && data.length ? data[0] : null);
      });
    return () => { cancelled = true; };
  }, [location, placement]);

  if (!banner) return null;

  const style = BANNER_STYLES.includes(banner.style) ? banner.style : 'minimal';
  const href = CTA_HREF[placement];
  const cta = banner.cta && href ? { href, label: banner.cta } : null;
  const image = banner.image_url && /^https:\/\//i.test(banner.image_url) ? banner.image_url : null;
  const ends = banner.show_end_date === false ? null : endsLabel(banner.ends_at);
  const b = { title: banner.title, body: banner.body, cta, image, ends };

  const inner = <Styled style={style} b={b} />;
  if (bare) return <div className={`w-full ${className}`}>{inner}</div>;
  return <div className={`max-w-6xl mx-auto px-5 md:px-8 my-4 ${className}`}>{inner}</div>;
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
