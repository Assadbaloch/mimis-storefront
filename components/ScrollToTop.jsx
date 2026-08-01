'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Resets scroll on every route change.
//
// Next normally handles this, but it does not survive this app's layout: the
// cart page is long and ends in a fixed bottom bar, and moving from it to the
// much shorter checkout left the window still scrolled hundreds of pixels
// down. Checkout's content is well above that point, so customers landed on
// empty space and had to scroll back up to find their order summary -- looking
// for all the world like a blank page.
//
// Anchor navigation is left alone: a URL carrying a hash is a deliberate
// request for a position on the page, so jumping to the top would break links
// such as /#locations.
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash) return;
    // 'instant' rather than smooth: a new page should already be at the top
    // when it appears, not animate there while the customer is reading it.
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
