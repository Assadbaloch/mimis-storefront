'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/rewards', label: 'Rewards' },
  { href: '/#locations', label: 'Locations' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const { count } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer automatically on navigation so it never lingers open
  // after a link click triggers a route change.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  function isActive(href) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href.replace('/#', '/'));
  }

  return (
    <header className="sticky top-0 z-50 bg-ink/90 backdrop-blur-md border-b border-cream/10">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="md:hidden w-10 h-10 -ml-1.5 flex flex-col items-center justify-center gap-[5px] rounded-full hover:bg-cream/10 active:scale-90 transition-all"
          >
            <span className="block w-5 h-[1.5px] bg-cream" />
            <span className="block w-5 h-[1.5px] bg-cream" />
            <span className="block w-5 h-[1.5px] bg-cream" />
          </button>
          <Link href="/" className="font-serif italic text-2xl text-gold tracking-tight">
            Mimi&rsquo;s
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-9">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={`nav-link ${isActive(link.href) ? 'active' : ''}`}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/cart" className="relative btn-secondary !px-4 !py-3" aria-label="View cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {count > 0 && (
              <span key={count} className="absolute -top-2 -right-2 bg-brick text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bump">
                {count}
              </span>
            )}
          </Link>
          <Link href="/menu" className="btn-primary hidden sm:inline-flex">Start Order</Link>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[90] md:hidden" role="dialog" aria-modal="true" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/60 animate-fade-in" />
          <div
            className="absolute top-0 left-0 h-full w-[80%] max-w-xs bg-[#16100b] border-r border-cream/10 animate-drawer-in flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between h-20 px-5 border-b border-cream/10 shrink-0">
              <span className="font-serif italic text-2xl text-gold">Mimi&rsquo;s</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="w-9 h-9 rounded-full bg-cream/10 flex items-center justify-center text-cream"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col px-5 pt-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`py-4 text-lg font-serif font-semibold border-b border-cream/[0.06] transition-colors ${
                    isActive(link.href) ? 'text-gold' : 'text-cream/85'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto p-5">
              <Link href="/menu" className="btn-primary w-full justify-center">Start Order</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
