import Link from 'next/link';
import { getStoreLocations } from '@/lib/storeLocations';
import { getSupabasePublicClient } from '@/lib/supabaseClient';

// Ported from the reference's Footer.tsx.
//
// The reference hardcoded both addresses, both phone numbers and linked its
// "Order Online" buttons at two legacy websites. Locations are part of the
// existing system (mimis.store_locations, which the location picker and Uber
// dispatch already use), so this reads them from there and links to /menu.
// Layout, colours and copy are otherwise the reference's.

async function getLogo() {
  const supabase = getSupabasePublicClient();
  const { data } = await supabase
    .from('storefront_settings').select('logo_url').eq('id', 1).maybeSingle();
  return data?.logo_url || null;
}

const EXPLORE = [
  { label: 'Menu', href: '/menu' },
  { label: 'Locations', href: '/contact' },
  { label: 'Rewards', href: '/rewards' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Contact', href: '/contact' },
  { label: 'Track an Order', href: '/order-status' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
];

export default async function ReferenceFooter() {
  const [locations, logoUrl] = await Promise.all([getStoreLocations(), getLogo()]);

  return (
    <footer
      className="relative overflow-hidden pt-16 pb-8"
      style={{
        background: 'var(--footer-bg-gradient, #1D2021)',
        borderTop: '1px solid var(--footer-border-color, rgba(255,255,255,.1))',
      }}
    >
      <div className="absolute inset-0 bg-[#1A120C] hidden dark:block pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-8">
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="MiMi's Pizza & Burger" className="h-12 md:h-32 lg:h-32 w-auto max-w-none" />
              )}
            </div>
            <p className="text-sm leading-relaxed mb-8 text-[#F3EFE4]/80 dark:text-[#EAEAEA]/70">
              100% Zabiha Halal pizza, burgers, wings, and comfort food &mdash; fresh from MiMi&rsquo;s Michigan kitchens. Real ingredients. Real flavor.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#0b4221]/30 dark:border-[#4ade80]/30 bg-[#0b4221]/10 dark:bg-[#4ade80]/10">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
              <span className="text-[10px] tracking-widest text-[#4ade80] font-bold uppercase">100% ZABIHA HALAL &bull; حلال</span>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-8 md:gap-16 md:contents">
            {locations.map((loc) => (
              <div key={loc.key}>
                <h4 className="text-[10px] tracking-widest text-[#C99700] dark:text-[#D8A73C] font-bold uppercase mb-6">
                  {loc.name}
                </h4>
                <div className="space-y-4">
                  <p className="text-sm text-[#F3EFE4]/80 dark:text-[#EAEAEA]/80 leading-relaxed">{loc.address}</p>
                  {loc.phone && (
                    <a
                      href={`tel:${loc.phone.replace(/[^\d+]/g, '')}`}
                      className="block text-sm text-[#F3EFE4]/80 dark:text-[#EAEAEA]/80 hover:text-[#C99700] dark:hover:text-[#D8A73C] transition-colors"
                    >
                      {loc.phone}
                    </a>
                  )}
                  <Link
                    href="/menu"
                    className="inline-block text-sm font-semibold transition-colors duration-300 text-[#F3EFE4] hover:text-[#C99700] dark:text-[#EAEAEA] dark:hover:text-[#D8A73C]"
                  >
                    Order Online &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-[10px] tracking-widest text-[#C99700] dark:text-[#D8A73C] font-bold uppercase mb-6">EXPLORE</h4>
            <ul className="grid grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-8">
              {EXPLORE.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm transition-colors duration-300 text-[#F3EFE4]/80 hover:text-[#C99700] dark:text-[#EAEAEA]/80 dark:hover:text-[#D8A73C]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#F3EFE4]/50 dark:text-[#EAEAEA]/50">
            &copy; {new Date().getFullYear()} MiMi&rsquo;s Pizza &amp; Burger. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
