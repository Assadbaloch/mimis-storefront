'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { displayCategory, categorySortIndex } from '@/lib/format';

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
  const [logoUrl, setLogoUrl] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuExpanded, setMenuExpanded] = useState(false);

  // Close the drawer automatically on navigation so it never lingers open
  // after a link click triggers a route change. Also collapse the Menu
  // sub-category accordion so it doesn't stay open into the next visit.
  useEffect(() => {
    setDrawerOpen(false);
    setMenuExpanded(false);
  }, [pathname]);

  // Compact category sub-nav, sourced live from Clover via menu_items.category
  // -- same grouping rules as /menu's own getMenu() -- so the header never goes
  // stale relative to whatever Clover actually has live. Light query: category
  // text only, not images/prices.
  useEffect(() => {
    const supabase = getSupabasePublicClient();
    supabase
      .from('menu_items')
      .select('category')
      .eq('available', true)
      .gt('price_cents', 0)
      .then(({ data, error }) => {
        if (error || !data) return;
        const seen = new Map();
        for (const row of data) {
          const key = (row.category || '').trim() || 'Uncategorized';
          if (!seen.has(key)) seen.set(key, displayCategory(key));
        }
        const cats = Array.from(seen.entries())
          .map(([key, label]) => ({ key, label }))
          .sort((a, b) => categorySortIndex(a.key) - categorySortIndex(b.key));
        setCategories(cats);
      });
  }, []);

  // Owner-uploaded logo from /admin/settings, falls back to the text
  // wordmark below when null. Fetched once -- the anon client's RLS allows
  // public read of the storefront_settings singleton row.
  useEffect(() => {
    const supabase = getSupabasePublicClient();
    supabase
      .from('storefront_settings')
      .select('logo_url')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data?.logo_url) setLogoUrl(data.logo_url);
      });
  }, []);

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
          <Link href="/" className="flex items-center" aria-label="Mimi's Pizza &amp; Burger home">
            {logoUrl ? (
              <span className="relative h-10 w-32 block">
                <Image src={logoUrl} alt="Mimi's Pizza &amp; Burger" fill className="object-contain object-left" sizes="160px" priority />
              </span>
            ) : (
              <span className="font-serif italic text-2xl text-gold tracking-tight">Mimi&rsquo;s</span>
            )}
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-9">
          {NAV_LINKS.map((link) =>
            link.href === '/menu' && categories.length > 0 ? (
              <div key={link.href} className="relative group/menu">
                <Link href={link.href} className={`nav-link inline-flex items-center gap-1.5 ${isActive(link.href) ? 'active' : ''}`}>
                  {link.label}
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="opacity-60 transition-transform duration-150 group-hover/menu:rotate-180 group-focus-within/menu:rotate-180"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </Link>
                {/* Compact category dropdown, sourced live from Clover. Hover/focus only --
                    tapping "Menu" itself still navigates straight to /menu either way. */}
                <div className="invisible opacity-0 translate-y-1 group-hover/menu:visible group-hover/menu:opacity-100 group-hover/menu:translate-y-0 group-focus-within/menu:visible group-focus-within/menu:opacity-100 group-focus-within/menu:translate-y-0 transition-all duration-150 absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50">
                  <div className="w-64 max-h-[70vh] overflow-y-auto rounded-2xl border border-cream/10 bg-ink shadow-2xl shadow-black/50 p-2">
                    {categories.map((cat) => (
                      <Link
                        key={cat.key}
                        href={`/menu?category=${encodeURIComponent(cat.key)}`}
                        className="block px-3.5 py-2.5 rounded-xl text-sm text-cream/80 hover:text-gold hover:bg-cream/[0.06] transition-colors"
                      >
                        {cat.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link key={link.href} href={link.href} className={`nav-link ${isActive(link.href) ? 'active' : ''}`}>
                {link.label}
              </Link>
            )
          )}
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
        <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/70 animate-fade-in" />
          <div
            className="absolute top-0 left-0 h-[100dvh] w-[80%] max-w-xs bg-ink border-r border-cream/10 animate-drawer-in flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between h-20 px-5 border-b border-cream/10 shrink-0 sticky top-0 bg-ink z-10">
              {logoUrl ? (
                <span className="relative h-9 w-28 block">
                  <Image src={logoUrl} alt="Mimi's Pizza &amp; Burger" fill className="object-contain object-left" sizes="120px" />
                </span>
              ) : (
                <span className="font-serif italic text-2xl text-gold">Mimi&rsquo;s</span>
              )}
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
              {NAV_LINKS.map((link) =>
                link.href === '/menu' && categories.length > 0 ? (
                  <div key={link.href} className="border-b border-cream/[0.06]">
                    <div className="flex items-center">
                      <Link
                        href={link.href}
                        className={`flex-1 py-4 text-lg font-serif font-semibold transition-colors ${
                          isActive(link.href) ? 'text-gold' : 'text-cream/85'
                        }`}
                      >
                        {link.label}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setMenuExpanded((v) => !v)}
                        aria-label={menuExpanded ? 'Hide menu categories' : 'Show menu categories'}
                        aria-expanded={menuExpanded}
                        className="w-10 h-10 -mr-1.5 shrink-0 flex items-center justify-center text-cream/50"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className={`transition-transform duration-150 ${menuExpanded ? 'rotate-180' : ''}`}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                    </div>
                    {menuExpanded && (
                      <div className="pb-3 pl-1 flex flex-col">
                        {categories.map((cat) => (
                          <Link
                            key={cat.key}
                            href={`/menu?category=${encodeURIComponent(cat.key)}`}
                            className="py-2.5 pl-3 text-sm text-cream/65 hover:text-gold transition-colors"
                          >
                            {cat.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`py-4 text-lg font-serif font-semibold border-b border-cream/[0.06] transition-colors ${
                      isActive(link.href) ? 'text-gold' : 'text-cream/85'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              )}
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
