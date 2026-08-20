'use client';
import { useState } from 'react';

// The two pieces of the reference's home page that need client state:
// a review card that expands, and the press carousel (embla in the reference,
// plain state here so the storefront gains no new dependency).

export function ReferenceReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.text.length > 120;

  return (
    <div className="bg-[#FFF9EC] dark:bg-[#1a0f0a] rounded-2xl p-10 border border-[rgba(29,32,33,0.1)] dark:border-white/5 shadow-[0_12px_30px_rgba(29,32,33,0.06)] hover:shadow-[0_20px_40px_rgba(29,32,33,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
      <div>
        <div className="flex gap-1 mb-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="w-4 h-4 text-[#C99700] dark:text-[#e6b95c]" />
          ))}
        </div>

        <p className={`text-xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-snug mb-4 ${!expanded ? 'line-clamp-2' : ''}`}>
          &ldquo;{review.text}&rdquo;
        </p>

        {isLong ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[#C99700] dark:text-[#e6b95c] text-xs font-bold tracking-widest uppercase hover:text-[#1D2021] dark:hover:text-[#f5ebd7] transition-colors mb-8"
          >
            {expanded ? 'Show less ↑' : '...Read more'}
          </button>
        ) : (
          <div className="mb-8" />
        )}
      </div>

      <div className="flex items-center gap-4 mt-auto pt-6 border-t border-[rgba(29,32,33,0.1)] dark:border-white/5">
        <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold ${review.color}`}>
          {review.initial}
        </div>
        <div>
          <p className="text-sm font-bold text-[#1D2021] dark:text-[#f5ebd7] mb-1">{review.name}</p>
          <p className="text-[9px] tracking-widest text-[#5F625F] dark:text-[#f5ebd7]/50 uppercase font-bold">
            {review.location} &bull; {review.source}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ReferencePressCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const go = (delta) => setIndex((i) => (i + delta + count) % count);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="w-full shrink-0" aria-hidden={i !== index}>
              {slide.type === 'video' ? (
                <div className="rounded-2xl overflow-hidden border border-white/15 dark:border-white/10 shadow-xl bg-black relative w-full aspect-video">
                  <iframe
                    src={slide.src}
                    title={slide.title}
                    className="absolute top-0 left-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <a
                  href={slide.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl overflow-hidden border border-white/15 dark:border-white/10 shadow-xl bg-black relative w-full aspect-video group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="absolute top-0 left-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-10">
                    <div className="bg-[#E0AE00] dark:bg-[#e6b95c] text-[#1D2021] text-[10px] md:text-xs font-bold uppercase tracking-wider py-1.5 px-4 w-fit rounded-full mb-4">
                      Read Article
                    </div>
                    <h3 className="text-2xl md:text-4xl font-serif font-bold text-white mb-2 md:mb-4 leading-tight group-hover:text-[#E0AE00] dark:group-hover:text-[#e6b95c] transition-colors">
                      {slide.title}
                    </h3>
                    <p className="text-white/80 font-serif text-sm md:text-base">{slide.caption}</p>
                  </div>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 mt-8">
        <Arrow label="Previous" onClick={() => go(-1)}>&larr;</Arrow>
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`w-2.5 h-2.5 rounded-full bg-[#E0AE00] dark:bg-[#e6b95c] transition-opacity ${i === index ? 'opacity-100' : 'opacity-40'}`}
            />
          ))}
        </div>
        <Arrow label="Next" onClick={() => go(1)}>&rarr;</Arrow>
      </div>
    </div>
  );
}

function Arrow({ children, label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="w-12 h-12 md:w-16 md:h-16 rounded-full inline-flex items-center justify-center bg-[#174A91] dark:bg-[#1a0f0a] border-2 border-[#E0AE00] dark:border-[#e6b95c] text-[#E0AE00] dark:text-[#e6b95c] hover:bg-[#E0AE00] hover:text-[#10396F] dark:hover:bg-[#e6b95c] dark:hover:text-black shadow-md dark:shadow-[0_0_24px_rgba(230,185,92,0.45)] transition-all duration-300 text-xl"
    >
      {children}
    </button>
  );
}

function Star({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
