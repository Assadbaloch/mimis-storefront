'use client';
import { useEffect, useState } from 'react';
import { MIN_PHOTO_PX } from '@/lib/imageCheck';

// Admin: flags a menu photo that is too small to look sharp on the website
// (2026-10-24 -- a 96 x 72 photo was picked as a product's main photo; the
// upload check only sees new files). Measures the original once in the browser.
export default function SmallPhotoBadge({ url }) {
  const [size, setSize] = useState(null);
  useEffect(() => {
    setSize(null);
    if (!url) return undefined;
    let alive = true;
    const im = new window.Image();
    im.onload = () => { if (alive) setSize({ w: im.naturalWidth, h: im.naturalHeight }); };
    im.src = url;
    return () => { alive = false; };
  }, [url]);
  if (!size || Math.min(size.w, size.h) >= MIN_PHOTO_PX) return null;
  return (
    <span className="absolute top-1 left-1 right-1 text-[9px] leading-tight font-bold bg-red-700/90 text-white rounded px-1 py-0.5 text-center"
      title={`This photo is only ${size.w}×${size.h} px. On the website it is shown smaller so it stays sharp. Upload the original photo (at least ${MIN_PHOTO_PX} px on its shorter side).`}>
      Too small · {size.w}×{size.h}
    </span>
  );
}
