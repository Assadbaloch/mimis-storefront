'use client';
import { useMemo, useState } from 'react';
import { formatPrice } from '@/lib/format';
import { useCart } from '@/lib/cart';
import ItemOptions from '@/components/ItemOptions';
import {
  useOptionsEnabled, useItemModifiers, unitPrice, chosenOptions, selectionProblem, hasOptions,
} from '@/lib/options';

// Options + quantity + special instructions + add-to-cart. Shared by the
// quick-add ProductModal and the /menu/[item] page so the two can never drift.
//
// Options (half & half, toppings by side, crust, remove, sizes) are shown
// exactly as Clover lists them and only when online_ordering_settings
// .options_enabled is on. The price here is for the customer's eyes; the server
// (mimis.price_online_items) prices what is actually charged.
export default function ProductDetailActions({ item, name, compact = false, onAdded }) {
  const { addItem } = useCart();
  const optionsEnabled = useOptionsEnabled();
  const mods = useItemModifiers(item);
  const full = useMemo(() => ({ ...item, modifiers: mods || [] }), [item, mods]);
  const showOptions = optionsEnabled && hasOptions(full);

  const [selected, setSelected] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [added, setAdded] = useState(false);

  const unit = showOptions ? unitPrice(full, selected) : item.price_cents;
  const problem = showOptions ? selectionProblem(full, selected) : (item.price_cents > 0 ? null : 'Not available online');

  function handleAdd() {
    if (problem) return;
    const opts = showOptions ? chosenOptions(full, selected) : [];
    addItem({
      clover_item_id: item.clover_item_id,
      name,
      price_cents: unit,
      quantity,
      options: opts.map((o) => o.clover_modifier_id),
      modifiers: opts,
      special_instructions: specialInstructions.trim(),
      image_url: item.image_url,
    });
    setAdded(true);
    setSelected([]);
    setTimeout(() => { setAdded(false); onAdded?.(); }, compact ? 700 : 1400);
  }

  const stepSize = compact ? 'w-8 h-8' : 'w-9 h-9';

  return (
    <div>
      {showOptions && <ItemOptions item={full} selected={selected} onChange={setSelected} />}

      <label className="block mt-5">
        <span className="text-app-soft text-xs uppercase tracking-wide font-bold">Special instructions (optional)</span>
        <textarea
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          placeholder="e.g. extra crispy, well done..."
          rows={2}
          className="input w-full mt-2 !text-sm"
        />
      </label>

      <div className={`flex items-center gap-4 mt-6 flex-wrap ${compact ? 'justify-between' : ''}`}>
        <div className="flex items-center gap-3 rounded-full border border-line px-2 py-1.5">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className={`${stepSize} rounded-full flex items-center justify-center text-app-soft hover:bg-app-wash transition-colors text-lg`}
          >
            −
          </button>
          <span className="w-6 text-center font-semibold text-app">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => Math.min(50, q + 1))}
            aria-label="Increase quantity"
            className={`${stepSize} rounded-full flex items-center justify-center text-app-soft hover:bg-app-wash transition-colors text-lg`}
          >
            +
          </button>
        </div>

        <button
          onClick={handleAdd}
          disabled={!!problem}
          className={`btn-primary ${compact ? '!px-6' : '!px-7 !py-4 flex-1 sm:flex-initial'} ${added ? 'animate-pulse-once' : ''} ${problem ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {added ? 'Added ✓' : problem ? problem : `Add ${quantity > 1 ? quantity + ' ' : ''}to Cart · ${formatPrice(unit * quantity)}`}
        </button>
      </div>
    </div>
  );
}
