'use client';
import { useEffect, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { useCart } from '@/lib/cart';
import { useLocation } from '@/lib/location';
import { displayName, formatPrice } from '@/lib/format';
import ProductModal from '@/components/ProductModal';

// "Add a drink or dip" on the cart page: drinks and dipping sauces from this
// store's live Clover menu that are not in the cart yet. A plain item is added
// with one tap; one with choices (a bottle's flavour, for example) opens its
// sheet so the customer picks, exactly as on the menu.
const ADDON_CATEGORY = /drink|sauce|sause/i;

export default function CartAddOns() {
  const { location } = useLocation();
  const { items, addItem } = useCart();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let live = true;
    getSupabasePublicClient()
      .from('menu_items')
      .select('id, product_id, clover_item_id, name, category, price_cents, image_url, video_url, badge_text, description_override, modifiers')
      .eq('location', location)
      .eq('available', true)
      .gt('price_cents', 0)
      .then(({ data }) => {
        if (!live) return;
        // Drinks first, then dips; cheapest first within each.
        const isDip = (r) => /sauce|sause/i.test(r.name || '');
        setRows((data || [])
          .filter((r) => ADDON_CATEGORY.test(r.category || ''))
          .sort((a, b) => (isDip(a) - isDip(b)) || (a.price_cents - b.price_cents)));
      }, () => {});
    return () => { live = false; };
  }, [location]);

  const inCart = new Set(items.map((i) => i.clover_item_id));
  const list = rows.filter((r) => !inCart.has(r.clover_item_id)).slice(0, 8);
  if (!list.length) return null;

  const hasChoices = (r) => Array.isArray(r.modifiers) && r.modifiers.some((g) => (g?.modifiers || []).length > 0);

  return (
    <section className="mt-8" aria-label="Add a drink or dip">
      <p className="section-label mb-3">Add a drink or dip</p>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
        {list.map((r) => (
          <button
            key={r.clover_item_id}
            type="button"
            onClick={() => {
              if (hasChoices(r)) { setOpen({ ...r, option_groups: r.modifiers.filter((g) => (g?.modifiers || []).length).length }); return; }
              addItem({ clover_item_id: r.clover_item_id, name: displayName(r.name), price_cents: r.price_cents, quantity: 1, modifiers: [], special_instructions: '', image_url: r.image_url });
            }}
            className="shrink-0 flex items-center gap-2.5 rounded-full border border-line bg-surface pl-3.5 pr-2 py-2 text-left hover:bg-app-wash transition-colors"
          >
            <span className="text-[13px] font-semibold text-app whitespace-nowrap">{displayName(r.name)}</span>
            <span className="text-[12px] text-app-soft tabular-nums">{formatPrice(r.price_cents)}</span>
            <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-accent text-on-accent text-sm leading-none">+</span>
          </button>
        ))}
      </div>
      {open && <ProductModal item={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
