'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useReferenceTheme } from './ReferenceTheme';

// Ported from the reference's Hero.tsx.
//
// The retry loop is the reference's and is not defensive padding: iOS Safari
// refuses a programmatic play() until the element is muted AND the page has
// been interacted with, so the first call routinely fails silently.

export default function ReferenceHero({ videoUrl }) {
  const videoRef = useRef(null);
  const { theme } = useReferenceTheme();
  const isLight = theme !== 'dark';

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;

    const attemptPlay = () => {
      if (video.paused) video.play().catch(() => {});
    };

    attemptPlay();
    const t1 = setTimeout(attemptPlay, 100);
    const t2 = setTimeout(attemptPlay, 500);

    const opts = { once: true, passive: true };
    window.addEventListener('touchstart', attemptPlay, opts);
    window.addEventListener('scroll', attemptPlay, opts);
    window.addEventListener('click', attemptPlay, opts);

    return () => {
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('touchstart', attemptPlay);
      window.removeEventListener('scroll', attemptPlay);
      window.removeEventListener('click', attemptPlay);
    };
  }, []);

  return (
    <section className="relative w-full h-[100dvh] bg-[#F3EFE4] dark:bg-[#0a0604] -mt-[4.4rem] md:-mt-[7rem]">
      <div className="absolute inset-0 w-full h-full overflow-hidden">

        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            filter: isLight ? 'contrast(1.08) saturate(1.12) sepia(0.06)' : 'none',
            transition: 'filter 0.5s ease',
          }}
        >
          {videoUrl && (
            <video
              ref={videoRef}
              autoPlay loop muted playsInline preload="auto"
              src={videoUrl}
              style={{ opacity: isLight ? 1 : 0.85 }}
              className="absolute inset-0 w-full h-full object-cover object-[65%_center] md:object-[center_15%] origin-center translate-y-[3%] md:translate-y-[6%] scale-[1.06] md:scale-[1.08]"
            />
          )}
        </div>

        {/* Light: a left reading panel only, so the food on the right keeps
            full saturation. A flat scrim would grey out the whole frame. */}
        <div
          className="absolute inset-0 pointer-events-none dark:hidden"
          style={{ background: 'linear-gradient(90deg, rgba(243,239,228,.92) 0%, rgba(243,239,228,.82) 28%, rgba(243,239,228,.48) 48%, rgba(243,239,228,.12) 70%, transparent 100%)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none dark:hidden"
          style={{ background: 'radial-gradient(ellipse 55% 70% at 0% 50%, rgba(201,151,0,.08) 0%, transparent 100%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-full pointer-events-none dark:hidden"
          style={{ height: '28%', background: 'linear-gradient(to top, rgba(243,239,228,.28) 0%, transparent 100%)' }}
        />

        <div
          className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{ background: 'linear-gradient(to right, rgba(10,6,4,0.5) 0%, transparent 60%)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{ background: 'linear-gradient(to top, rgba(10,6,4,0.6) 0%, transparent 60%)' }}
        />

        <div className="relative z-10 flex flex-col justify-end md:justify-center px-6 sm:px-10 md:px-16 lg:px-24 pb-16 md:pb-0 pt-32 h-full">
          <div
            className="w-full relative mx-auto md:mx-0 h-full flex flex-col justify-center items-center md:items-start text-center md:text-left"
            style={{ maxWidth: 'min(90vw, 820px)' }}
          >
            <h1
              className="font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-[1.0] tracking-tight w-full mb-8 md:mb-10"
              style={{ fontSize: 'clamp(2.4rem, 8vw, 6.5rem)' }}
            >
              Home of the<br />
              Famous<br />
              <span className="italic text-[#C99700] dark:text-[#e6b95c]">Yummy</span><br />
              Pizza
            </h1>

            <div className="inline-flex flex-col gap-4 md:gap-6 mb-6 md:mb-10">
              <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4 lg:gap-5">
                <Link
                  href="/menu"
                  className="inline-flex items-center justify-center bg-[#C8102E] hover:bg-[#A80D27] text-white dark:bg-[#b41d24] dark:hover:bg-[#9a181e] rounded-full font-bold transition-all hover:scale-105 duration-300 shadow-lg"
                  style={{ fontSize: 'clamp(0.85rem, 1.8vw, 1.15rem)', height: 'clamp(44px, 5.5vw, 64px)', padding: '0 clamp(24px, 4vw, 48px)' }}
                >
                  ORDER ONLINE &rarr;
                </Link>
                <Link
                  href="/menu"
                  className="inline-flex items-center justify-center bg-[#FFF9EC] text-[#174A91] border-2 border-[#174A91] hover:bg-[#174A91] hover:text-white dark:bg-black/40 dark:backdrop-blur-sm dark:text-[#f5ebd7] dark:border-[#f5ebd7]/40 dark:hover:bg-white/10 rounded-full font-bold transition-all hover:scale-105 duration-300 shadow-sm"
                  style={{ fontSize: 'clamp(0.85rem, 1.8vw, 1.15rem)', height: 'clamp(44px, 5.5vw, 64px)', padding: '0 clamp(24px, 4vw, 48px)' }}
                >
                  VIEW MENU
                </Link>
              </div>

              <div className="w-full flex justify-center md:justify-start">
                <Link
                  href="/rewards"
                  className="flex items-center text-[#0b4221] dark:text-[#4ade80] font-bold uppercase tracking-wider hover:text-[#C8102E] dark:hover:text-white transition-colors"
                  style={{ fontSize: 'clamp(10px, 1.5vw, 15px)', letterSpacing: '0.15em' }}
                >
                  Join Rewards &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 w-full h-20 md:h-28 pointer-events-none z-20 dark:hidden"
          style={{ background: 'linear-gradient(to top, rgba(243,239,228,.65) 0%, transparent 100%)' }}
        />
        <div className="absolute bottom-0 left-0 w-full h-24 md:h-36 bg-gradient-to-t from-[#0a0604] to-transparent pointer-events-none z-20 hidden dark:block" />
      </div>
    </section>
  );
}
