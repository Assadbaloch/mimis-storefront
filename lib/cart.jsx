'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'mimis-cart-v1';

// Identity of a cart line. Two adds of the same product with the same
// modifiers and instructions collapse into one line with a higher quantity.
//
// Exported because callers outside the cart need to answer "is this exact
// product already in the basket, and how many?" -- the menu card's quantity
// stepper, for one. Recomputing that string by hand at the call site is how
// the two silently drift apart the first time this format changes.
export function cartKeyFor(item) {
  return (
    item.clover_item_id +
    JSON.stringify(item.modifiers || []) +
    (item.special_instructions || '')
  );
}

function readStoredCart() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const api = useMemo(() => ({
    items,
    count: items.reduce((sum, i) => sum + i.quantity, 0),
    totalCents: items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0),
    addItem(item) {
      setItems((prev) => {
        const key = cartKeyFor(item);
        const existing = prev.find((i) => i._key === key);
        if (existing) {
          return prev.map((i) => (i._key === key ? { ...i, quantity: i.quantity + item.quantity } : i));
        }
        return [...prev, { ...item, _key: key }];
      });
    },
    updateQuantity(key, quantity) {
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((i) => i._key !== key)
          : prev.map((i) => (i._key === key ? { ...i, quantity } : i))
      );
    },
    removeItem(key) {
      setItems((prev) => prev.filter((i) => i._key !== key));
    },
    clear() {
      setItems([]);
    },
  }), [items]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
