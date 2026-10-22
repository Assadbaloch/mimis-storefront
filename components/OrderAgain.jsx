'use client';
import { useEffect, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { useCart } from '@/lib/cart';
import { useLocation } from '@/lib/location';
import { displayName } from '@/lib/format';

// "Order again" for a customer's last website order ON THIS DEVICE.
// The order is remembered only in this browser (checkout writes
// mimis-order-history), so nobody else's orders can ever show here. Before
// anything goes back in the cart it is re-priced by the server's own pricing
// (price_online_items): today's Clover prices and options, and anything no
// longer on this store's menu is left out and said so.
export const HISTORY_KEY = 'mimis-order-history';
const MAX_AGE_DAYS = 90;

function readLastOrder(location) {
  try {
    const list = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
    const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
    return list.find((o) => o && o.location === location && Array.isArray(o.items) && o.items.length && Date.parse(o.at) > cutoff) || null;
  } catch {
    return null;
  }
}

export default function OrderAgain() {
  const { location } = useLocation();
  const { addItem } = useCart();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState('idle'); // idle | adding | done | error
  const [note, setNote] = useState('');

  useEffect(() => { setOrder(readLastOrder(location)); setState('idle'); setNote(''); }, [location]);

  if (!order) return null;

  const summary = order.items
    .map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ''}${displayName(i.name)}`)
    .join(', ');

  async function addAll() {
    setState('adding');
    setNote('');
    try {
      const { data, error } = await getSupabasePublicClient().rpc('price_online_items', {
        p_location: location,
        p_items: order.items.map((i) => ({
          clover_item_id: i.clover_item_id,
          quantity: i.quantity,
          options: i.options || [],
          special_instructions: i.special_instructions || '',
        })),
      });
      if (error || !data) throw new Error(error?.message || 'no answer');
      const priced = Array.isArray(data.items) ? data.items : [];
      for (const p of priced) {
        const opts = Array.isArray(p.options) ? p.options : [];
        const original = order.items.find((i) => i.clover_item_id === p.clover_item_id);
        addItem({
          clover_item_id: p.clover_item_id,
          name: displayName(p.name),
          price_cents: p.unit_cents,
          quantity: p.quantity,
          options: opts.map((o) => o.id),
          modifiers: opts.map((o) => ({ name: o.name, price_cents: o.price_cents, group: o.group, clover_modifier_id: o.id })),
          special_instructions: p.special_instructions || '',
          image_url: original?.image_url || null,
        });
      }
      const missing = Array.isArray(data.errors) ? data.errors.length : 0;
      setState('done');
      setNote(
        priced.length === 0
          ? 'Those items are no longer on the menu here.'
          : missing > 0
            ? `Added to your cart. ${missing} item${missing === 1 ? ' is' : 's are'} no longer on the menu and ${missing === 1 ? 'was' : 'were'} left out.`
            : 'Added to your cart.'
      );
    } catch {
      setState('error');
      setNote('Could not add your last order right now. Please try again.');
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mt-2 mb-2">
      <div className="rounded-app border border-line bg-surface px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="section-label !mb-0.5">Order again</p>
          <p className="text-app text-sm truncate" title={summary}>{summary}</p>
          {note && <p className={`text-xs mt-1 ${state === 'error' ? 'text-danger' : 'text-app-soft'}`} role="status">{note}</p>}
        </div>
        <button
          type="button"
          onClick={addAll}
          disabled={state === 'adding' || state === 'done'}
          className="btn-primary !px-5 !py-2 !text-[12px] shrink-0 self-start sm:self-auto disabled:opacity-60"
        >
          {state === 'adding' ? 'Adding…' : state === 'done' ? 'Added ✓' : 'Add to cart'}
        </button>
      </div>
    </section>
  );
}
