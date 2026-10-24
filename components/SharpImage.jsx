'use client';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { IMAGE_QUALITY } from '@/lib/imageQuality';

// A menu photo that never shows blurry (2026-10-24).
//
// Blur comes from stretching a photo past its real pixels: a 96 x 72 picture
// in a 305 px card on a 2x phone is enlarged 8 times. The image optimiser
// never enlarges, so after the photo loads we read the real pixels of the file
// the browser received (a second Image on the same, already-cached URL -- no
// extra download). If that file is the original (narrower than what was asked
// for) and the card would enlarge it more than MAX_UPSCALE device pixels per
// photo pixel, the card switches to "fit": the photo is shown at a size it can
// hold sharply, centred, over a soft, darkened copy of itself that fills the
// card. Big photos are untouched.
//
// fit: 'cover' (cards) | 'contain' (gallery lightbox). Needs a positioned parent (like next/image fill).
const MAX_UPSCALE = 1.25;

export default function SharpImage({ src, alt = '', sizes, className = '', fit = 'cover', priority = false, quality, onLoad, ...rest }) {
  const [small, setSmall] = useState(null); // { url, w, h } when the original is too small for its box
  useEffect(() => { setSmall(null); }, [src]);

  const handleLoad = useCallback((e) => {
    const img = e.currentTarget;
    onLoad?.(e);
    const cur = img.currentSrc || img.src;
    if (!cur || typeof window === 'undefined') return;
    let asked = 0;
    try { asked = Number(new URL(cur, window.location.href).searchParams.get('w')) || 0; } catch { /* plain URL */ }
    const probe = new window.Image();
    probe.onload = () => {
      const pw = probe.naturalWidth, ph = probe.naturalHeight;
      if (!pw || !ph) return;
      if (asked && pw >= asked) return;            // a resized copy: the original is bigger than this
      const box = img.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const dpr = window.devicePixelRatio || 1;
      const scale = fit === 'contain' ? Math.min(box.width / pw, box.height / ph) : Math.max(box.width / pw, box.height / ph);
      if (scale * dpr > MAX_UPSCALE) setSmall({ url: cur, w: pw, h: ph });
    };
    probe.src = cur;
  }, [fit, onLoad]);

  if (small) {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const maxW = Math.max(1, Math.floor((small.w * MAX_UPSCALE) / dpr));
    const maxH = Math.max(1, Math.floor((small.h * MAX_UPSCALE) / dpr));
    return (
      <>
        <span aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <img src={small.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.15)', filter: 'blur(24px) brightness(.75)' }} />
        </span>
        <span className="absolute inset-0 flex items-center justify-center">
          <img src={small.url} alt={alt} data-sharp-fit="1" className={className.replace(/\bobject-(cover|contain)\b/g, '')}
            style={{ maxWidth: `min(100%, ${maxW}px)`, maxHeight: `min(100%, ${maxH}px)`, width: 'auto', height: 'auto', objectFit: 'contain' }} />
        </span>
      </>
    );
  }
  return (
    <Image src={src} alt={alt} fill sizes={sizes} priority={priority} quality={quality ?? IMAGE_QUALITY}
      className={className} onLoad={handleLoad} {...rest} />
  );
}
