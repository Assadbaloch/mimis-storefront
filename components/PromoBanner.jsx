'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { useLocation } from '@/lib/location';

// Owner-managed promotion banner (dashboard → Promotions). Nothing about any
// specific offer lives in code: the title, text, button, image, placements,
// dates, hours and store all come from mimis.promotions through the public
// live_promotion_banners() RPC, which only returns a banner while its
// promotion is live. The banner advertises; the discount itself is decided
// only by checkout on the server.
//
// placement: 'home' | 'menu' | 'cart' | 'checkout'
const CTA_HREF = { home: '/menu', menu: null, cart: '/checkout', checkout: null };

export default function PromoBanner({ placement, className = '' }) {
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
  const href = CTA_HREF[placement];
  const image = banner.image_url && /^https:\/\//i.test(banner.image_url) ? banner.image_url : null;

  return (
    <div className={`max-w-6xl mx-auto px-5 md:px-8 my-4 ${className}`}>
      <div className="flex items-center gap-3 rounded-app border border-highlight-line bg-highlight-wash px-4 py-2.5">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" loading="lazy" />
        ) : (
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-highlight" />
        )}
        <p className="min-w-0 flex-1 text-sm leading-snug text-app">
          <span className="font-semibold">{banner.title}</span>
          {banner.body && <span className="text-app-soft"> · {banner.body}</span>}
        </p>
        {banner.cta && href && (
          <Link
            href={href}
            className="shrink-0 text-sm font-semibold text-app underline decoration-highlight decoration-2 underline-offset-4 hover:opacity-80"
          >
            {banner.cta} <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
