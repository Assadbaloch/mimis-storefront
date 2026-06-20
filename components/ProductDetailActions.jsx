'use client';
import { useState } from 'react';
import { formatPrice } from '@/lib/format';
import { useCart } from '@/lib/cart';

// Quantity + special instructions + add-to-cart, factored out of ProductModal
// so the dedicated /menu/[item] page and the quick-add modal share the exact
// same cart-adding logic instead of drifting apart over time.
export default function ProductDetailActions({ item, name }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      clover_item_id: item.clover_item_id,
      name,
      price_cents: item.price_cents,
      quantity,
      modifiers: [],
      special_instructions: specialInstructions.trim(),
      image_url: item.image_url,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <div>
      <label className="block">
        <span className="text-cream/50 text-xs uppercase tracking-wide font-bold">Special instructions (optional)</span>
        <textarea
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          placeholder="e.g. extra crispy, no onions..."
          rows={2}
          className="input w-full mt-2 !text-sm"
        />
      </label>

      <div className="flex items-center gap-4 mt-6 flex-wrap">
        <div className="flex items-center gap-3 rounded-full border border-cream/15 px-2 py-1.5">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="w-9 h-9 rounded-full flex items-center justify-center text-cream/80 hover:bg-cream/10 transition-colors text-lg"
          >
            −
          </button>
          <span className="w-6 text-center font-semibold text-cream">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="Increase quantity"
            className="w-9 h-9 rounded-full flex items-center justify-center text-cream/80 hover:bg-cream/10 transition-colors text-lg"
          >
            +
          </button>
        </div>

        <button onClick={handleAdd} className={`btn-primary !px-7 !py-4 flex-1 sm:flex-initial ${added ? 'animate-pulse-once' : ''}`}>
          {added ? 'Added ✓' : `Add ${quantity > 1 ? quantity + ' ' : ''}to Cart · ${formatPrice(item.price_cents * quantity)}`}
        </button>
      </div>
    </div>
  );
}
