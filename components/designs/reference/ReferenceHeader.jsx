'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useReferenceTheme } from './ReferenceTheme';
import ReferenceLocationPicker from './ReferenceLocationPicker';

// Ported from the reference's Header.tsx.
//
// Two deliberate differences, both because this runs on the real storefront
// rather than a static marketing site:
//   - the logo comes from Storefront Settings instead of a baked-in file
//   - ORDER ONLINE points at /menu, not /contact, so it reaches the real
//     ordering flow
// Everything else -- sizes, colours, breakpoints, scroll behaviour -- is the
// reference's.

const NAV = [
  { name: 'Home', href: '/' },
  { name: 'Menu', href: '/menu' },
  { name: 'Locations', href: '/contact' },
  { name: 'Rewards', href: '/rewards' },
  { name: 'Reviews', href: '/reviews' },
];

// Routes that belong to the ordering flow. They keep "Menu" highlighted so a
// customer deep in checkout still sees where they are.
const MENU_FLOW = ['/menu', '/cart', '/checkout', '/order-confirmed'];

export default function ReferenceHeader({ logoUrl }) {
  const pathname = usePathname() || '/';
  const { theme, toggleTheme } = useReferenceTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A route change with the panel still open would leave it covering the new
  // page, since nothing unmounts the header between navigations.
  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);

  function isActive(href) {
    if (href === '/') return pathname === '/';
    if (href === '/menu') return MENU_FLOW.some((r) => pathname === r || pathname.startsWith(`${r}/`));
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-col">
      <div
        className={`transition-all duration-300 bg-[#F3EFE4]/95 dark:bg-[#1a0c08]/85 backdrop-blur-md py-2 border-b border-[rgba(29,32,33,0.1)] dark:border-white/5 ${
          isScrolled ? 'shadow-md dark:shadow-sm' : ''
        }`}
      >
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
          <Link href="/" className="relative z-50 flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="MiMi's Pizza & Burger"
                className={`w-auto max-w-none transition-all duration-300 ${
                  isScrolled
                    ? 'h-[2.9rem] md:h-[5.3rem] lg:h-[5.3rem]'
                    : 'h-[3.4rem] md:h-[6.0rem] lg:h-[6.0rem]'
                }`}
              />
            ) : (
              <span className="font-serif font-bold text-2xl text-[#1D2021] dark:text-[#f5ebd7]">MiMi&rsquo;s</span>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {NAV.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`text-xs font-bold tracking-widest uppercase transition-colors py-1 ${
                  isActive(link.href)
                    ? 'text-[#C8102E] dark:text-[#e6b95c] border-b-2 border-[#C8102E] dark:border-[#e6b95c]'
                    : 'text-[#1D2021] hover:text-[#C8102E] dark:text-[#f5ebd7] dark:hover:text-[#e6b95c]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {/* Not in the reference design. Added because the two restaurants
                have separate Clover menus -- without this a customer on the
                wrong store has no way to change it from the header. */}
            <ReferenceLocationPicker />

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              className="p-2.5 rounded-full border border-[rgba(29,32,33,0.12)] dark:border-white/10 bg-[#EAE4D5] dark:bg-[#2a1a12] hover:scale-105 transition-transform"
            >
              {theme === 'light' ? <MoonIcon className="w-4 h-4 text-[#174A91]" /> : <SunIcon className="w-4 h-4 text-[#e6b95c]" />}
            </button>

            <Link
              href="/menu"
              className="inline-flex items-center bg-[#C8102E] hover:bg-[#A80D27] dark:bg-[#b41d24] dark:hover:bg-[#9a181e] text-white rounded-full text-xs font-bold h-10 px-6 transition-colors shadow-sm"
            >
              ORDER ONLINE &rarr;
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2 relative z-50">
            <ReferenceLocationPicker />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-full border border-[rgba(29,32,33,0.12)] dark:border-white/10 bg-[#EAE4D5] dark:bg-[#2a1a12]"
            >
              {theme === 'light' ? <MoonIcon className="w-5 h-5 text-[#174A91]" /> : <SunIcon className="w-5 h-5 text-[#e6b95c]" />}
            </button>
            <button
              type="button"
              className="p-2 text-[#1D2021] dark:text-[#f5ebd7]"
              aria-label="Menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((v) => !v)}
            >
              {isMobileMenuOpen ? <XIcon className="w-6 h-6" /> : <BurgerIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 bg-[#F3EFE4] dark:bg-[#0a0604] z-40 transition-transform duration-300 ease-in-out md:hidden flex flex-col pt-32 px-6 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <nav className="flex flex-col gap-6 text-center">
          {NAV.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-2xl font-bold text-[#1D2021] dark:text-[#f5ebd7] hover:text-[#C8102E] dark:hover:text-[#e6b95c] transition-colors uppercase tracking-widest"
            >
              {link.name}
            </Link>
          ))}
          <div className="mt-8 flex flex-col gap-4">
            <Link
              href="/menu"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full inline-flex items-center justify-center bg-[#C8102E] hover:bg-[#A80D27] dark:bg-[#b41d24] dark:hover:bg-[#9a181e] text-white rounded-full py-6 text-lg font-bold shadow-md"
            >
              ORDER ONLINE &rarr;
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

/* Inline SVGs rather than lucide-react, which the storefront does not depend on. */
function MoonIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
function SunIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}
function BurgerIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
}
function XIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>;
}
