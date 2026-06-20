'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'mimis-cart-v1';

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
        const key = item.clover_item_id + JSON.stringify(item.modifiers || []) + (item.special_instructions || '');
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
