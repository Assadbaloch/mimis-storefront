'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { useLocation } from '@/lib/location';
import { orderItems, readDismissed, saveDismissed, endsLabel } from '@/components/PromoBanner';

// Announcement bar: a thin strip that scrolls every live offer set to the
// "Announcement bar" placement, just under the site header, on every page the
// owner chose (dashboard → Promotions → offer → Storefront banner). Colour,
// speed and order (random / priority) are the owner's Banner settings. Nothing
// about any offer is in code.
//
// Layout contract: while the bar is showing it sets --promo-bar-h on <html>.
// The fixed reference header's <main> padding, the hero's pull-up and the
// menu's sticky bars add that height, so nothing is covered or shifted under it.

// Layout effect in the browser (no flash of covered content), plain effect
// during server render so React does not warn.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const BAR_H = '2.25rem';
const SPEED_PX_S = { slow: 35, normal: 55, fast: 85 };
const THEME = {
  accent: 'bg-accent text-on-accent',
  dark: 'bg-[#1D2021] text-[#F3EFE4]',
  gold: 'bg-highlight text-on-highlight',
  cream: 'bg-surface-strong text-app border-b border-line',
};

function pageKey(path) {
  if (path === '/' || path === '') return 'home';
  const seg = path.split('/')[1];
  return ['menu', 'rewards', 'reviews', 'contact', 'cart', 'checkout'].includes(seg) ? seg : 'other';
}

export default function PromoBar() {
  const pathname = usePathname() || '/';
  const { location } = useLocation();
  const [rows, setRows] = useState([]);
  const [closedKey, setClosedKey] = useState(null);
  const [dismissed, setDismissed] = useState({});

  useEffect(() => { setDismissed(readDismissed()); }, []);

  useEffect(() => {
    let cancelled = false;
    getSupabasePublicClient()
      .rpc('live_promotion_banners', { p_location: location, p_placement: 'bar' })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { console.error('live_promotion_banners(bar)', error.message); setRows([]); return; }
        setRows(Array.isArray(data) ? data : []);
      });
    return () => { cancelled = true; };
  }, [location]);

  const page = pageKey(pathname);
  const onPage = rows.filter((r) => !r.bar_pages || r.bar_pages.length === 0 || r.bar_pages.includes(page));
  // Closing the bar hides this exact set of offers; a new offer brings it back.
  const barKey = 'bar:' + onPage.map((r) => r.promotion_id).sort().join(',');
  const hidden = pathname.startsWith('/admin') || !onPage.length || dismissed[barKey] || closedKey === barKey;

  // Reserve the bar's height in the layout only while it is on screen.
  useIsoLayoutEffect(() => {
    const root = document.documentElement;
    if (hidden) root.style.removeProperty('--promo-bar-h');
    else root.style.setProperty('--promo-bar-h', BAR_H);
    return () => root.style.removeProperty('--promo-bar-h');
  }, [hidden]);

  if (hidden) return null;

  const settings = rows[0] || {};
  const theme = THEME[settings.bar_theme] || THEME.accent;
  const linkable = !['menu', 'cart', 'checkout'].includes(page);
  const items = orderItems(onPage.map((r) => ({
    id: r.promotion_id,
    title: r.title,
    body: r.body,
    ends: r.show_end_date === false ? null : endsLabel(r.ends_at),
    cta: r.cta && linkable ? r.cta : null,
  })), rows);

  const close = () => { saveDismissed(barKey); setClosedKey(barKey); };

  return (
    <div role="region" aria-label="Current offers" className={`relative flex items-center overflow-hidden ${theme}`} style={{ height: BAR_H }}>
      <Marquee items={items} speed={SPEED_PX_S[settings.bar_speed] || SPEED_PX_S.normal} />
      <button
        type="button"
        onClick={close}
        aria-label="Hide offers"
        className={`absolute right-0 top-0 z-10 grid h-full w-10 place-items-center text-lg leading-none shadow-[-12px_0_12px_-4px_rgba(0,0,0,0.12)] ${theme}`}
      >
        <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-black/15">×</span>
      </button>
    </div>
  );
}

function Marquee({ items, speed }) {
  const groupRef = useRef(null);
  const [copies, setCopies] = useState(2);
  const [duration, setDuration] = useState(30);

  // Enough copies of the offer list to more than fill the screen, then the
  // track is doubled and slid by exactly half -- a seamless loop at a constant
  // speed whatever the screen width or number of offers.
  useIsoLayoutEffect(() => {
    const el = groupRef.current;
    if (!el) return;
    const measure = () => {
      const one = el.scrollWidth / copies || 1;
      const need = Math.max(1, Math.ceil(window.innerWidth / one));
      if (need !== copies) { setCopies(need); return; }
      setDuration(Math.max(8, (one * copies) / speed));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [copies, speed, items.length]);

  const group = (hidden) => (
    <div ref={hidden ? undefined : groupRef} className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {Array.from({ length: copies }).flatMap((_, c) => items.map((it) => (
        <Item key={`${c}-${it.id}`} it={it} tabbable={!hidden && c === 0} />
      )))}
    </div>
  );

  return (
    <div className="promo-marquee flex w-max pr-10" style={{ animationDuration: `${duration}s` }}>
      {group(false)}
      {group(true)}
    </div>
  );
}

function Item({ it, tabbable }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap px-6 text-[13px] leading-none">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      <b className="font-semibold">{it.title}</b>
      {it.body && <span className="opacity-85">{it.body}</span>}
      {it.ends && <span className="opacity-75">· {it.ends}</span>}
      {it.cta && (
        <Link href="/menu" tabIndex={tabbable ? undefined : -1} className="font-bold underline underline-offset-4 hover:opacity-80">
          {it.cta} →
        </Link>
      )}
    </span>
  );
}
