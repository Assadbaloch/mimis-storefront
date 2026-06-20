'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { formatPrice, displayName } from '@/lib/format';

// Rotating "trending / suggested for you" banner for the rewards dashboard.
// Successor to the rotating trending banner originally built for the
// hq.astrixshop.com Customer Portal (index.html, June 17 2026) -- same
// real-database-driven idea (mimis.top_items_by_period RPC, same denylist
// for non-product line items), but enhanced for the storefront: shows the
// item's real photo when one exists and links straight to that product on
// /menu (auto-opens its detail modal there) instead of being a dead end,
// closing the original "direct the customer to the product itself" ask.
const DENYLIST = new Set([
  'can', 'glass bottle', 'custom item',
  'tax', 'tip', 'delivery fee', 'service charge', 'gratuity', 'convenience fee',
]);
const ROTATE_MS = 4500;
const HIDE_KEY = 'mimis-storefront-trending-hidden';
const LABELS = ['🔥 Trending now', '⭐ Customer favorite', '👍 Popular pick', "💛 Mimi's bestseller"];

export default function TrendingBanner() {
  const [items, setItems] = useState(null); // null = still loading, [] = nothing usable
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(window.localStorage.getItem(HIDE_KEY) === '1');
    load();
  }, []);

  async function load() {
    try {
      const supabase = getSupabasePublicClient();
      const { data: trending, error: trendErr } = await supabase.rpc('top_items_by_period', {
        p_date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_date_to: new Date().toISOString(),
        p_date_col: 'clover_order_time',
        p_limit: 40,
      });
      if (trendErr || !trending?.length) {
        setItems([]);
        return;
      }

      const candidateNames = trending
        .map((t) => t.item_name)
        .filter((n) => !DENYLIST.has(displayName(n).toLowerCase()));

      const { data: menuRows } = await supabase
        .from('menu_items')
        .select('clover_item_id, name, price_cents, image_url, video_url')
        .eq('available', true)
        .gt('price_cents', 0)
        .in('name', candidateNames);

      const byName = new Map((menuRows || []).map((m) => [m.name, m]));
      const seen = new Set();
      const ranked = trending
        .map((t) => byName.get(t.item_name))
        .filter((m) => m && !seen.has(m.clover_item_id) && seen.add(m.clover_item_id))
        .slice(0, 8);

      setItems(ranked);
    } catch (err) {
      console.error('TrendingBanner load failed', err);
      setItems([]);
    }
  }

  useEffect(() => {
    if (!items || items.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [items]);

  function dismiss(e) {
    e.preventDefault();
    e.stopPropagation();
    window.localStorage.setItem(HIDE_KEY, '1');
    setHidden(true);
  }

  if (hidden || !items || items.length === 0) return null;

  const item = items[index];
  const label = LABELS[index % LABELS.length];

  return (
    <Link
      href={`/menu?item=${item.clover_item_id}`}
      className="group relative flex items-center gap-3.5 rounded-2xl border border-gold/25 bg-gold/[0.05] hover:border-gold/50 px-4 py-3.5 mb-6 transition-colors"
    >
      <div key={item.clover_item_id} className="flex items-center gap-3.5 w-full min-w-0 animate-fade-in">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-cream/10 shrink-0">
          {item.video_url ? (
            <video src={item.video_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
          ) : item.image_url ? (
            <Image src={item.image_url} alt={displayName(item.name)} fill className="object-cover" sizes="56px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif italic text-gold/40 text-base">M</span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-gold text-[10px] font-bold uppercase tracking-wide mb-0.5">{label}</p>
          <p className="text-cream text-sm font-semibold truncate">{displayName(item.name)}</p>
          <p className="text-cream/45 text-xs">{formatPrice(item.price_cents)} &middot; tap to view &amp; order</p>
        </div>
        <span className="text-gold/70 text-sm font-bold shrink-0 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-1.5 right-1.5 text-cream/30 hover:text-cream/60 text-xs w-5 h-5 flex items-center justify-center"
      >
        &#10005;
      </button>
    </Link>
  );
}
