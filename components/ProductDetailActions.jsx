'use client';
import { useEffect, useMemo, useState } from 'react';
import { formatPrice } from '@/lib/format';
import { useCart } from '@/lib/cart';
import ItemOptions from '@/components/ItemOptions';
import {
  useOptionsState, useItemModifiers, unitPrice, chosenOptions, selectionProblem, hasOptions, missingSectionKey,
} from '@/lib/options';

// Options + special instructions + quantity + add-to-cart. Shared by the item
// sheet (ProductModal, variant "modal") and the /menu/[item] page (variant
// "page") so the two can never drift.
//
// Options are shown exactly as Clover lists them and only when
// online_ordering_settings.options_enabled is on. The price here is for the
// customer's eyes; the server (mimis.price_online_items) prices what is charged.
//
// Renders two siblings: the body and a sticky add bar. In the sheet the parent
// is the scrolling flex column, so the bar pins to its bottom (mt-auto keeps it
// at the bottom when the content is short).
const LINE = 'var(--mimis-line)';

export default function ProductDetailActions({ item, name, variant = 'modal', onAdded }) {
  const { addItem } = useCart();
  const optionsState = useOptionsState();
  const mods = useItemModifiers(item);
  const full = useMemo(() => ({ ...item, modifiers: mods || [] }), [item, mods]);
  // option_groups comes from the menu page (0 = nothing to choose), so plain
  // items never wait on the options fetch.
  const noOptions = item.option_groups === 0;
  const loading = !noOptions && (optionsState === null || (optionsState === true && mods === null));
  const showOptions = !noOptions && optionsState === true && mods !== null && hasOptions(full);

  const [selected, setSelected] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [notesOpen, setNotesOpen] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [added, setAdded] = useState(false);
  const [attention, setAttention] = useState(null);

  // Item page: the add bar is pinned to the bottom of a phone screen, where the
  // chat bubble sits (globals.css hides it under this class on phones only).
  useEffect(() => {
    if (variant !== 'page') return undefined;
    document.body.classList.add('mimis-item-page');
    return () => document.body.classList.remove('mimis-item-page');
  }, [variant]);

  const unit = showOptions ? unitPrice(full, selected) : item.price_cents;
  const problem = loading
    ? 'Loading…'
    : showOptions
      ? selectionProblem(full, selected)
      : item.price_cents > 0 ? null : 'Not available online';
  const blocked = loading || problem === 'Not available online';

  function handleAdd() {
    if (added) return;
    if (problem) {
      const key = showOptions ? missingSectionKey(full, selected) : null;
      if (key) setAttention({ key, n: Date.now() });
      return;
    }
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
    setTimeout(() => {
      setAdded(false);
      setSelected([]);
      setQuantity(1);
      setSpecialInstructions('');
      setNotesOpen(false);
      onAdded?.();
    }, variant === 'modal' ? 650 : 1400);
  }

  const pad = variant === 'modal' ? 'px-5 md:px-7' : '';
  const bar =
    variant === 'modal'
      ? 'sticky bottom-0 mt-auto px-5 md:px-7 bg-surface-strong'
      : 'sticky bottom-0 md:static -mx-5 px-5 md:mx-0 md:px-0 md:mt-2 bg-[var(--mimis-bg)] md:bg-transparent';

  return (
    <>
      <div className={`${pad} pt-5 pb-5`}>
        {loading ? <OptionsSkeleton rows={Math.min(item.option_groups || 2, 4)} /> : showOptions ? (
          <ItemOptions item={full} selected={selected} onChange={setSelected} attention={attention} />
        ) : null}

        <div className={loading || showOptions ? 'mt-4' : ''}>
          {notesOpen ? (
            <label className="block rounded-app border bg-surface px-4 py-3.5" style={{ borderColor: LINE }}>
              <span className="font-serif font-semibold text-[17px] text-app">Special instructions</span>
              <textarea
                autoFocus
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. well done, cut in squares…"
                rows={2}
                maxLength={200}
                className="input w-full mt-2 !text-sm"
              />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setNotesOpen(true)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-app-soft hover:text-app transition-colors py-1"
            >
              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs leading-none" style={{ borderColor: LINE }} aria-hidden="true">+</span>
              Add special instructions
            </button>
          )}
        </div>
      </div>

      <div
        className={`${bar} z-10 border-t pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]`}
        style={{ borderColor: variant === 'page' ? undefined : LINE, borderTopColor: LINE }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center h-12 rounded-full border shrink-0" style={{ borderColor: LINE }}>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              className="w-10 h-full rounded-l-full flex items-center justify-center text-app text-lg hover:bg-app-wash disabled:opacity-30 transition-colors"
            >
              −
            </button>
            <span className="w-6 text-center font-semibold text-app tabular-nums" aria-live="polite">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              aria-label="Increase quantity"
              className="w-10 h-full rounded-r-full flex items-center justify-center text-app text-lg hover:bg-app-wash transition-colors"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={blocked}
            className={`btn-primary flex-1 h-12 !py-0 !px-5 !text-[12.5px] !justify-between ${added ? 'animate-pulse-once' : ''} ${problem && !blocked ? '!opacity-90' : ''}`}
          >
            <span className="truncate">{added ? 'Added ✓' : loading ? 'Add to cart' : problem || 'Add to cart'}</span>
            {!added && unit > 0 && problem !== 'Not available online' && (
              <span className="tabular-nums tracking-normal text-[14px]">{formatPrice(unit * quantity)}</span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

function OptionsSkeleton({ rows }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-app border bg-surface px-4 py-4" style={{ borderColor: LINE }}>
          <div className="h-4 w-40 rounded-full bg-app-wash animate-pulse" />
          <div className="h-3 w-28 rounded-full bg-app-wash animate-pulse mt-2.5" />
        </div>
      ))}
    </div>
  );
}
