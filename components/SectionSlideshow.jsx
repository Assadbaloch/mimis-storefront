'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// Carousel section for the page builder.
//
// Separate from the existing "gallery" block, which is a static grid and stays
// as-is. This is a client component because it needs interaction (arrows, dots,
// autoplay) -- PageSections itself is a server component, so the interactive
// part has to live in its own island rather than being inlined there.
//
// Deliberate behaviours:
//   * Autoplay pauses on hover/focus and respects prefers-reduced-motion, so it
//     can't fight a customer who is trying to read a caption.
//   * Swipe works on touch, since most storefront traffic is phones.
//   * Slides are real <img>/<video> tags rather than CSS backgrounds so they
//     stay visible with images disabled and remain accessible.
export default function SectionSlideshow({ images = [], headline = '', autoplay = false, interval = 5, rounded = true }) {
  const slides = (Array.isArray(images) ? images : []).filter(Boolean);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);

  const count = slides.length;
  const go = useCallback((next) => {
    if (!count) return;
    setIndex(((next % count) + count) % count);
  }, [count]);

  useEffect(() => {
    if (!autoplay || paused || count < 2) return;
    if (typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const ms = Math.max(2, Number(interval) || 5) * 1000;
    const t = setTimeout(() => go(index + 1), ms);
    return () => clearTimeout(t);
  }, [autoplay, paused, index, interval, count, go]);

  if (!count) return null;

  const isVideo = (url) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(url));
  const radius = rounded === false ? '' : 'rounded-app-lg';

  return (
    <section className="max-w-5xl mx-auto px-5 py-12">
      {headline && (
        <h2 className="font-serif font-bold text-3xl text-app text-center mb-6">{headline}</h2>
      )}

      <div
        className={`relative overflow-hidden ${radius} bg-app-wash`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
        role="region"
        aria-roledescription="carousel"
        aria-label={headline || 'Image slideshow'}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((src, i) => (
            <div key={`${src}-${i}`} className="w-full shrink-0 aspect-[16/9] bg-app-wash" aria-hidden={i !== index}>
              {isVideo(src) ? (
                <video src={src} className="w-full h-full object-cover" muted loop playsInline autoPlay />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
              )}
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-scrim text-white flex items-center justify-center hover:opacity-90"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-scrim text-white flex items-center justify-center hover:opacity-90"
            >
              ›
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-highlight' : 'w-2 bg-app-tint'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
