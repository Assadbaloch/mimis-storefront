'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/#locations', label: 'Locations' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-ink/90 backdrop-blur-md border-b border-cream/10">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="font-serif italic text-2xl text-gold tracking-tight">
          Mimi&rsquo;s
        </Link>

        <nav className="hidden md:flex items-center gap-9">
          {NAV_LINKS.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href.replace('/#', '/'));
            return (
              <Link key={link.href} href={link.href} className={`nav-link ${active ? 'active' : ''}`}>
                {link.label}
              </Link>
            );
          })}
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
    </header>
  );
}
