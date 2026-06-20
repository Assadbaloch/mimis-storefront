'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';

// Shared swipeable media gallery -- used by both the quick-add ProductModal
// and the full /menu/[item] product page. `media` is the ordered
// mimis.menu_item_media rows for this item (media_type, url, sort_order).
// Falls back to the single image_url/video_url cover fields when an item has
// no gallery rows (shouldn't happen after the backfill migration, but kept
// as a safety net so older/partial data never renders blank).
export default function Gallery({ media, fallbackImage, fallbackVideo, name, badgeText, aspect = 'aspect-[4/3]', lightboxEnabled = false }) {
  const slides = media?.length
    ? media
    : [
        fallbackVideo ? { media_type: 'video', url: fallbackVideo } : null,
        fallbackImage ? { media_type: 'image', url: fallbackImage } : null,
      ].filter(Boolean);

  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const dragRef = useRef({ startX: 0, dragging: false });

  const safeIndex = Math.min(index, Math.max(slides.length - 1, 0));
  const current = slides[safeIndex];

  function go(delta) {
    setIndex((i) => {
      const next = i + delta;
      if (next < 0) return slides.length - 1;
      if (next >= slides.length) return 0;
      return next;
    });
  }

  function handleDown(e) {
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    dragRef.current = { startX: x, dragging: true };
  }
  function handleUp(e) {
    if (!dragRef.current.dragging) return;
    const endX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? dragRef.current.startX;
    const delta = endX - dragRef.current.startX;
    dragRef.current.dragging = false;
    if (Math.abs(delta) < 40) return;
    go(delta < 0 ? 1 : -1);
  }

  if (!slides.length) {
    return (
      <div className={`relative ${aspect} bg-gradient-to-br from-cream/10 to-black/40 flex items-center justify-center`}>
        <span className="font-serif italic text-gold/30 text-4xl">Mimi&rsquo;s</span>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`relative ${aspect} bg-gradient-to-br from-cream/10 to-black/40 overflow-hidden select-none touch-pan-y ${lightboxEnabled ? 'cursor-zoom-in' : ''}`}
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onTouchStart={handleDown}
        onTouchEnd={handleUp}
        onClick={() => lightboxEnabled && setLightbox(true)}
      >
        {current.media_type === 'video' ? (
          <video
            key={current.url}
            src={current.url}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover pointer-events-none animate-fade-in"
          />
        ) : (
          <Image
            key={current.url}
            src={current.url}
            alt={name || ''}
            fill
            className="object-cover pointer-events-none animate-fade-in"
            sizes="(max-width: 768px) 100vw, 640px"
            priority={safeIndex === 0}
          />
        )}

        {badgeText && (
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wide text-gold border border-gold/60 rounded-full px-2.5 py-1 bg-ink/70 z-10">
            {badgeText}
          </span>
        )}

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); go(-1); }}
              aria-label="Previous photo"
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-ink/70 text-cream items-center justify-center hover:bg-ink z-10 transition-colors"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); go(1); }}
              aria-label="Next photo"
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-ink/70 text-cream items-center justify-center hover:bg-ink z-10 transition-colors"
            >
              ›
            </button>
            <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1.5 z-10">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === safeIndex ? 'w-5 bg-gold' : 'w-1.5 bg-cream/40'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-0.5 py-2.5">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`View photo ${i + 1}`}
              className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                i === safeIndex ? 'border-gold' : 'border-cream/15 hover:border-cream/35'
              }`}
            >
              {s.media_type === 'video' ? (
                <>
                  <video src={s.url} muted className="absolute inset-0 w-full h-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-cream text-[10px]">▶</span>
                </>
              ) : (
                <Image src={s.url} alt="" fill className="object-cover" sizes="56px" />
              )}
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/92 flex items-center justify-center animate-fade-in"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-ink/80 text-cream flex items-center justify-center z-10"
          >
            ✕
          </button>
          <div
            className="relative w-[92vw] max-w-3xl aspect-[4/3]"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={handleDown}
            onPointerUp={handleUp}
            onTouchStart={handleDown}
            onTouchEnd={handleUp}
          >
            {current.media_type === 'video' ? (
              <video src={current.url} autoPlay muted loop playsInline controls className="absolute inset-0 w-full h-full object-contain" />
            ) : (
              <Image src={current.url} alt={name || ''} fill className="object-contain" sizes="92vw" />
            )}
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); go(-1); }}
                  aria-label="Previous photo"
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink/70 text-cream flex items-center justify-center"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); go(1); }}
                  aria-label="Next photo"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-ink/70 text-cream flex items-center justify-center"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
