'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Resets scroll on route changes.
//
// The cart page is long and ends in a fixed bar; checkout is much shorter. A
// single scrollTo on navigation was not enough -- the position was still being
// restored afterwards, landing customers in the footer with their order
// summary far above them, which reads as a blank page.
//
// So this fires repeatedly rather than once: synchronously before paint, on
// the next frame, and twice more shortly after. Whatever restores the old
// offset does so within that window, and re-asserting zero a few times is
// imperceptible when the target is already zero.
//
// Two deliberate exemptions:
//   * the first mount -- a fresh load or a refresh mid-page should keep the
//     browser's own restored position rather than being yanked to the top.
//   * any URL carrying a hash, which is an explicit request for a position on
//     the page (e.g. /#locations).
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function ScrollToTop() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useIsomorphicLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window === 'undefined' || window.location.hash) return;

    // Plain two-argument form: the options object with behavior:'instant' is
    // not honoured everywhere and silently does nothing when it is not.
    const jump = () => window.scrollTo(0, 0);

    jump();
    const frame = requestAnimationFrame(jump);
    const t1 = setTimeout(jump, 60);
    const t2 = setTimeout(jump, 240);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

  return null;
}
