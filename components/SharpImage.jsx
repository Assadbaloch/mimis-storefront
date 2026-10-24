'use client';
import Image from 'next/image';
import { IMAGE_QUALITY } from '@/lib/imageQuality';

// Menu photo (2026-10-24). Always fills its box, like before. Sharpness comes
// from asking the optimiser for a large enough copy (callers pass `sizes` that
// allow for the square crop) and from the quality layer (lib/imageQuality.js).
// A photo whose original is too small is NOT shrunk or boxed here: it is
// flagged in the admin ("Too small") so the owner can send a better photo.
export default function SharpImage({ src, alt = '', sizes, className = '', fit = 'cover', priority = false, quality, ...rest }) {
  return (
    <Image src={src} alt={alt} fill sizes={sizes} priority={priority} quality={quality ?? IMAGE_QUALITY}
      className={className} {...rest} />
  );
}
