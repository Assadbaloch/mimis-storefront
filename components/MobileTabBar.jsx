'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';

// Primary mobile destinations live here (always-visible bottom tab bar);
// secondary links (Rewards detail anchors, Locations) live in SiteHeader's
// hamburger drawer. Together they replace the old mobile state of "no nav
// menu in the header at all."
const TABS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/menu', label: 'Menu', icon: 'menu' },
  { href: '/cart', label: 'Cart', icon: 'cart' },
  { href: '/rewards', label: 'Rewards', icon: 'star' },
];

function TabIcon({ icon, active }) {
  const stroke = active ? '#e6b95c' : 'rgba(245,235,215,0.55)';
  if (icon === 'home') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    );
  }
  if (icon === 'menu') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    );
  }
  if (icon === 'cart') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    );
  }
  if (icon === 'star') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  return null;
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink/95 backdrop-blur-md border-t border-cream/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-between px-1">
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5">
              <TabIcon icon={tab.icon} active={active} />
              {tab.icon === 'cart' && count > 0 && (
                <span key={count} className="absolute top-1 right-[28%] bg-brick text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-bump">
                  {count}
                </span>
              )}
              <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? 'text-gold' : 'text-cream/55'}`}>
                {tab.label}
              </span>
              {active && <span className="absolute top-0 inset-x-[30%] h-[2px] bg-gold rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
