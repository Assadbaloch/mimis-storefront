'use client';
import { useEffect } from 'react';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';

// Connects server-rendered theme HTML to the React cart.
//
// Theme pages are static markup — they have no React components and cannot call
// hooks. Rather than requiring designers to register custom elements or write
// JS, this listens at the document level: any element carrying data-mimis-add
// adds to the cart when clicked, wherever it came from.
//
// Event delegation (not per-element listeners) is deliberate: theme HTML is
// injected via dangerouslySetInnerHTML and can change on navigation, so there
// is no reliable mount hook to attach listeners in. Delegation keeps working
// for markup that appears later.

export default function CartBridge() {
  const cart = useCart();

  // --- clicks: add to cart -------------------------------------------------
  useEffect(() => {
    function onClick(e) {
      const el = e.target.closest?.('[data-mimis-add]');
      if (!el) return;
      e.preventDefault();

      let payload;
      try {
        payload = JSON.parse(el.getAttribute('data-mimis-add'));
      } catch {
        return; // malformed payload: do nothing rather than throw on a live page
      }
      if (!payload?.clover_item_id) return;

      cart.addItem({
        clover_item_id: payload.clover_item_id,
        name: payload.name,
        price_cents: Number(payload.price_cents) || 0,
        quantity: Number(payload.quantity) || 1,
        image_url: payload.image_url || null,
        modifiers: payload.modifiers || [],
        special_instructions: payload.special_instructions || '',
      });

      // Visible confirmation, since a static page has no other feedback.
      const previous = el.getAttribute('data-mimis-label') ?? el.textContent;
      el.setAttribute('data-mimis-label', previous);
      el.textContent = 'Added ✓';
      el.setAttribute('data-mimis-added', 'true');
      setTimeout(() => {
        el.textContent = previous;
        el.removeAttribute('data-mimis-added');
      }, 1400);
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [cart]);

  // --- live cart figures in themed markup ---------------------------------
  useEffect(() => {
    for (const el of document.querySelectorAll('[data-mimis-cart-count]')) {
      el.textContent = String(cart.count);
      // Lets a theme hide the badge at zero with CSS: [data-mimis-cart-empty]
      el.toggleAttribute('data-mimis-cart-empty', cart.count === 0);
    }
    for (const el of document.querySelectorAll('[data-mimis-cart-total]')) {
      el.textContent = formatPrice(cart.totalCents);
    }
  }, [cart.count, cart.totalCents]);

  return null;
}
