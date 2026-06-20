'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart';
import { REDEMPTION_CODE_KEY } from '@/lib/loyalty';

// Surfaces a customer's already-redeemed reward code while they browse the
// menu -- same code shown on /rewards (RewardsLookup.jsx) and auto-applied at
// /checkout via the same localStorage key. Closes the original request's
// "show discount codes on menu page... so everything fits together
// seamlessly" ask: customers don't have to remember to go back to /rewards
// or /checkout to see the code is still live.
export default function MenuRewardBanner() {
  const { count } = useCart();
  const [code, setCode] = useState(null);

  useEffect(() => {
    setCode(window.localStorage.getItem(REDEMPTION_CODE_KEY) || null);
  }, []);

  function remove() {
    window.localStorage.removeItem(REDEMPTION_CODE_KEY);
    setCode(null);
  }

  if (!code) return null;

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 -mt-2 mb-6">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gold/[0.06] px-4 py-3">
        <p className="text-cream text-sm min-w-0">
          🎁 Reward code <span className="text-gold font-serif tracking-wide">{code}</span> pending &mdash; applies automatically at checkout.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          {count > 0 && (
            <Link href="/checkout" className="text-gold text-xs font-semibold hover:text-gold/80">
              Checkout &rarr;
            </Link>
          )}
          <button type="button" onClick={remove} className="text-cream/40 hover:text-cream/70 text-xs">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
