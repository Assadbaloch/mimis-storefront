'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';

// Persistent "you have food waiting" bar.
//
// Why this exists: the bottom tab bar is only rendered on the untheme d
// layout. With a theme active -- which is the live configuration -- a customer
// could add five items on /menu and have no visible route to checkout at all
// except scrolling back to the top for the header cart link. On a phone, on a
// long menu, that is the difference between an order and an abandoned session.
//
// Deliberately NOT shown on /cart and /checkout: there it would duplicate the
// page's own primary action and cover content. Also hidden on order tracking,
// where the order is already placed.
const HIDE_ON = ['/cart', '/checkout', '/order-status', '/order-confirmed'];

export default function CartBar() {
  const { count, totalCents } = useCart();
  const pathname = usePathname() || '/';
  const [bumping, setBumping] = useState(false);
  const prevCount = useRef(count);

  const hidden = count === 0 || HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // A short pulse whenever the count rises confirms the tap landed, without
  // needing a toast that covers the menu.
  useEffect(() => {
    if (count > prevCount.current) {
      setBumping(true);
      const t = setTimeout(() => setBumping(false), 420);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  // Reserve space at the bottom of the document so the bar never covers the
  // last row of menu items or the footer, and let the theme hide its own
  // floating CTA while this is up (two stacked bars is worse than none).
  useEffect(() => {
    document.body.classList.toggle('has-cart-bar', !hidden);
    return () => document.body.classList.remove('has-cart-bar');
  }, [hidden]);

  if (hidden) return null;

  return (
    <Link
      href="/cart"
      aria-label={`View cart, ${count} item${count === 1 ? '' : 's'}, ${formatPrice(totalCents)}`}
      className={`fixed inset-x-3 bottom-3 z-[60] flex items-center justify-between gap-3 rounded-full
        bg-accent text-on-accent shadow-2xl shadow-black/40 pl-5 pr-3 py-3
        md:inset-x-auto md:right-5 md:min-w-[320px] animate-fade-in
        ${bumping ? 'animate-pulse-once' : ''}`}
      style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <span className="grid place-items-center w-7 h-7 rounded-full bg-on-accent-soft text-[13px] font-bold tabular-nums shrink-0">
          {count}
        </span>
        <span className="text-sm font-bold uppercase tracking-wide truncate">
          {count === 1 ? '1 item' : `${count} items`}
        </span>
      </span>
      <span className="flex items-center gap-3 shrink-0">
        <span className="font-serif font-semibold text-lg tabular-nums">{formatPrice(totalCents)}</span>
        <span className="rounded-full bg-on-accent-soft px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide">
          View Cart →
        </span>
      </span>
    </Link>
  );
}
