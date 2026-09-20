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
    <div className={`max-w-6xl mx-auto px-5 md:px-8 my-6 ${className}`}>
      <div className="flex flex-col sm:flex-row items-stretch overflow-hidden rounded-app border border-highlight-line bg-highlight-wash">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="w-full sm:w-48 h-32 sm:h-auto object-cover" loading="lazy" />
        )}
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="font-serif font-bold text-lg text-app">{banner.title}</p>
            {banner.body && <p className="text-app-soft text-sm mt-1">{banner.body}</p>}
          </div>
          {banner.cta && href && (
            <Link href={href} className="btn-primary shrink-0 justify-center">{banner.cta}</Link>
          )}
        </div>
      </div>
    </div>
  );
}
