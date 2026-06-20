import Link from 'next/link';

const LOCATIONS = [
  { name: 'Madison Heights', address: '28931 John R Rd, Madison Heights, MI 48071', status: 'Now Taking Orders' },
  { name: 'Warren', address: '8113 E 9 Mile Rd, Warren, MI 48089', status: 'Opening Soon' },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-cream/10 bg-black/30 mt-24">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 grid gap-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="font-serif italic text-2xl text-gold mb-3">Mimi&rsquo;s</div>
          <p className="text-cream/70 text-sm max-w-xs leading-relaxed">
            Fresh, halal pizza &amp; burgers made to order in Michigan kitchens.
          </p>
          <div className="inline-flex items-center gap-2 mt-5 text-xs font-bold uppercase tracking-wide text-cream/80 border border-cream/20 rounded-full px-4 py-2">
            <span className="text-gold">&#10003;</span> 100% Halal
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6" id="locations">
          {LOCATIONS.map((loc) => (
            <div key={loc.name}>
              <div className="text-sm font-bold text-cream mb-1">{loc.name}</div>
              <div className="text-xs text-cream/60 leading-relaxed">{loc.address}</div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-gold mt-2">{loc.status}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="section-label mb-3">Explore</div>
          <ul className="space-y-2 text-sm text-cream/70">
            <li><Link href="/" className="hover:text-gold">Home</Link></li>
            <li><Link href="/menu" className="hover:text-gold">Menu</Link></li>
            <li><Link href="/rewards" className="hover:text-gold">Rewards</Link></li>
            <li><Link href="/order-status" className="hover:text-gold">Track an Order</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10 py-5 text-center text-xs text-cream/40">
        &copy; {new Date().getFullYear()} Mimi&rsquo;s Pizza &amp; Burger. All rights reserved.
      </div>
    </footer>
  );
}
