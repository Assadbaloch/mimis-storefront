'use client';
import { useEffect, useRef, useState } from 'react';

// Desktop category tabs used to simply overflow with no visual hint there
// was more to see. Now: edge fade gradients + hover chevrons signal there's
// more, scroll-snap + mouse-drag make it feel swipeable rather than just
// "technically scrollable," and the active pill auto-centers into view both
// on tap and as the page's own scroll-spy advances `active` while scrolling.
export default function CategoryPills({ categories, active, onSelect }) {
  const scrollRef = useRef(null);
  const pillRefs = useRef({});
  const dragRef = useRef({ down: false, startX: 0, startScroll: 0, moved: false });
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  function updateFades() {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 4);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateFades();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateFades, { passive: true });
    window.addEventListener('resize', updateFades);
    return () => {
      el.removeEventListener('scroll', updateFades);
      window.removeEventListener('resize', updateFades);
    };
  }, [categories]);

  useEffect(() => {
    const el = pillRefs.current[active];
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [active]);

  function scrollByPage(direction) {
    scrollRef.current?.scrollBy({ left: direction * scrollRef.current.clientWidth * 0.7, behavior: 'smooth' });
  }

  // Mouse-only drag-to-scroll -- touch already gets native swiping from
  // overflow-x-auto, so we don't want to double-handle touch pointer events.
  function handlePointerDown(e) {
    if (e.pointerType !== 'mouse') return;
    dragRef.current = { down: true, startX: e.clientX, startScroll: scrollRef.current.scrollLeft, moved: false };
  }
  function handlePointerMove(e) {
    if (!dragRef.current.down) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 3) dragRef.current.moved = true;
    scrollRef.current.scrollLeft = dragRef.current.startScroll - dx;
  }
  function handlePointerUp() {
    dragRef.current.down = false;
  }

  return (
    <div className="sticky top-20 z-40 bg-ink/95 backdrop-blur-md border-b border-cream/10 -mx-5 px-5 md:-mx-8 md:px-8">
      <div className="relative max-w-6xl mx-auto">
        {showLeftFade && (
          <>
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-ink/95 to-transparent z-10" />
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              aria-label="Scroll categories left"
              className="hidden md:flex absolute left-0.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-ink border border-cream/20 text-cream/70 hover:text-gold hover:border-gold/50 items-center justify-center transition-colors"
            >
              ‹
            </button>
          </>
        )}
        {showRightFade && (
          <>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-ink/95 to-transparent z-10" />
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              aria-label="Scroll categories right"
              className="hidden md:flex absolute right-0.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-ink border border-cream/20 text-cream/70 hover:text-gold hover:border-gold/50 items-center justify-center transition-colors"
            >
              ›
            </button>
          </>
        )}
        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="flex gap-2.5 overflow-x-auto py-4 no-scrollbar snap-x snap-proximity scroll-smooth cursor-grab active:cursor-grabbing select-none"
        >
          {categories.map((cat) => (
            <button
              key={cat.key}
              ref={(el) => (pillRefs.current[cat.key] = el)}
              onClick={(e) => {
                if (dragRef.current.moved) {
                  e.preventDefault();
                  return;
                }
                onSelect(cat.key);
              }}
              className={`cat-pill snap-start ${active === cat.key ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
