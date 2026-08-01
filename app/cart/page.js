'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import MemberRewardsPanel from '@/components/MemberRewardsPanel';

export default function CartPage() {
  const { items, totalCents, updateQuantity, removeItem } = useCart();
  // Mirrors MemberRewardsPanel's selected-reward value so the cart can show
  // a real subtotal/discount/total-due breakdown right where the reward is
  // chosen, instead of only revealing the math after checkout is submitted.
  const [discountCents, setDiscountCents] = useState(0);
  const dueCents = Math.max(totalCents - discountCents, 0);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-24 text-center">
        <h1 className="font-serif font-bold text-3xl text-app mb-3">Your cart is empty</h1>
        <p className="text-app-soft mb-8">Add something tasty from the menu to get started.</p>
        <Link href="/menu" className="btn-primary">Browse the Menu</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-16 pb-40 md:pb-28">
      <h1 className="font-serif font-bold text-3xl md:text-4xl text-app mb-8">Your Order</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item._key} className="flex items-center gap-4 border-b border-line pb-4 animate-fade-in">
            <div className="flex-1">
              <p className="font-serif font-semibold text-app">{item.name}</p>
              {item.special_instructions && (
                <p className="text-app-faint text-xs mt-0.5">{item.special_instructions}</p>
              )}
              <p className="text-highlight text-sm mt-1">{formatPrice(item.price_cents)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item._key, item.quantity - 1)}
                className="w-7 h-7 rounded-full border border-app-tint text-app-soft hover:border-highlight hover:text-highlight active:scale-90 transition-transform"
              >&minus;</button>
              <span className="w-6 text-center text-app">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item._key, item.quantity + 1)}
                className="w-7 h-7 rounded-full border border-app-tint text-app-soft hover:border-highlight hover:text-highlight active:scale-90 transition-transform"
              >+</button>
            </div>
            <button onClick={() => removeItem(item._key)} className="text-app-faint hover:text-danger text-xs ml-2">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-8 pt-4">
        <span className="text-app-soft text-lg">Subtotal</span>
        <span className={`font-serif font-semibold text-2xl ${discountCents > 0 ? 'text-app-soft line-through' : 'text-highlight'}`}>
          {formatPrice(totalCents)}
        </span>
      </div>
      {discountCents > 0 && (
        <>
          <div className="flex items-center justify-between pt-1">
            <span className="text-highlight text-sm">Reward discount</span>
            <span className="text-highlight text-sm">&minus;{formatPrice(discountCents)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-line">
            <span className="text-app-soft text-lg">Total due</span>
            <span className="text-highlight font-serif font-semibold text-2xl">{formatPrice(dueCents)}</span>
          </div>
        </>
      )}
      <p className="text-app-faint text-xs mt-1">Tax and any applicable fees are calculated at checkout.</p>

      <div className="mt-8">
        <MemberRewardsPanel onDiscountChange={setDiscountCents} />
      </div>

      {/* Sticky checkout bar -- previously the only CTA was a button below the
          full item list, which on a long order meant scrolling past everything
          to find it. Sits above the mobile bottom tab bar (which is itself
          md:hidden, fixed bottom-0), flush to the viewport bottom on desktop. */}
      <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-30 bg-surface-strong backdrop-blur-md border-t border-line">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-app-faint text-[11px] uppercase tracking-wide font-bold">
              {discountCents > 0 ? 'Total due' : 'Subtotal'}
            </p>
            <p className="text-highlight font-serif font-semibold text-lg">{formatPrice(dueCents)}</p>
            {discountCents > 0 && (
              <p className="text-highlight text-[11px]">Reward applied &minus;{formatPrice(discountCents)}</p>
            )}
          </div>
          <Link href="/checkout" className="btn-primary !flex shrink-0">
            Continue to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
