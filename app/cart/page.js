'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import MemberRewardsPanel from '@/components/MemberRewardsPanel';

export default function CartPage() {
  const { items, totalCents, updateQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-24 text-center">
        <h1 className="font-serif font-bold text-3xl text-cream mb-3">Your cart is empty</h1>
        <p className="text-cream/55 mb-8">Add something tasty from the menu to get started.</p>
        <Link href="/menu" className="btn-primary">Browse the Menu</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-16 pb-40 md:pb-28">
      <h1 className="font-serif font-bold text-3xl md:text-4xl text-cream mb-8">Your Order</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item._key} className="flex items-center gap-4 border-b border-cream/10 pb-4 animate-fade-in">
            <div className="flex-1">
              <p className="font-serif font-semibold text-cream">{item.name}</p>
              {item.special_instructions && (
                <p className="text-cream/45 text-xs mt-0.5">{item.special_instructions}</p>
              )}
              <p className="text-gold text-sm mt-1">{formatPrice(item.price_cents)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item._key, item.quantity - 1)}
                className="w-7 h-7 rounded-full border border-cream/20 text-cream/70 hover:border-gold hover:text-gold active:scale-90 transition-transform"
              >&minus;</button>
              <span className="w-6 text-center text-cream">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item._key, item.quantity + 1)}
                className="w-7 h-7 rounded-full border border-cream/20 text-cream/70 hover:border-gold hover:text-gold active:scale-90 transition-transform"
              >+</button>
            </div>
            <button onClick={() => removeItem(item._key)} className="text-cream/40 hover:text-brick text-xs ml-2">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-8 pt-4">
        <span className="text-cream/70 text-lg">Subtotal</span>
        <span className="text-gold font-serif font-semibold text-2xl">{formatPrice(totalCents)}</span>
      </div>
      <p className="text-cream/40 text-xs mt-1">Tax and any applicable fees are calculated at checkout.</p>

      <div className="mt-8">
        <MemberRewardsPanel />
      </div>

      {/* Sticky checkout bar -- previously the only CTA was a button below the
          full item list, which on a long order meant scrolling past everything
          to find it. Sits above the mobile bottom tab bar (which is itself
          md:hidden, fixed bottom-0), flush to the viewport bottom on desktop. */}
      <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-30 bg-ink/95 backdrop-blur-md border-t border-cream/10">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-cream/45 text-[11px] uppercase tracking-wide font-bold">Subtotal</p>
            <p className="text-gold font-serif font-semibold text-lg">{formatPrice(totalCents)}</p>
          </div>
          <Link href="/checkout" className="btn-primary !flex shrink-0">
            Continue to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
