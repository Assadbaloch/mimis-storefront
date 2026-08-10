'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from '@/lib/location';
import { useCart } from '@/lib/cart';

// Two related pieces:
//
//   <LocationPicker />  inline control in the header -- shows the current store
//                       and switches between them.
//   <LocationGate />    first-visit prompt, rendered once at the layout level.
//
// Switching stores always empties the basket. That is not a UX preference: a
// cart line is keyed by clover_item_id, and the two restaurants are separate
// Clover merchant accounts, so the SAME burger has a different id (and often a
// different price) at each. Carrying lines across would send Warren item ids to
// Madison Heights' Clover account at checkout, which fails -- or worse, silently
// charges the wrong price. So we confirm first, then clear.

function useLocationSwitch() {
  const { location, setLocation } = useLocation();
  const cart = useCart();

  return function switchTo(next) {
    if (next === location) return true;
    if (cart.count > 0) {
      const ok = window.confirm(
        `Switching to ${next} will empty your basket.\n\n` +
        `Prices and items are set by each restaurant, so a basket built at ${location} can't carry over.`
      );
      if (!ok) return false;
      cart.clear();
    }
    setLocation(next);
    return true;
  };
}

export function LocationPicker({ className = '' }) {
  const { location, locations, current } = useLocation();
  const switchTo = useLocationSwitch();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Nothing to choose between -- don't show a control that can't do anything.
  if (locations.length < 2) return null;

  return (
    <div className={`relative ${className}`} ref={ref}>
      {/* Sizing matters here: this sits in the global header, so anything that
          refuses to shrink pushes the whole page wider than a phone screen and
          makes every route scroll sideways. Hence min-w-0 + truncate, and the
          "Ordering from" caption only appears once there's room for it. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Ordering from ${current?.display_name || location}`}
        className="flex items-center gap-1.5 text-left rounded-full px-2 sm:px-3 py-2 hover:bg-cream/10 transition-colors min-w-0 max-w-[42vw] sm:max-w-none"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-70">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="leading-tight min-w-0">
          <span className="hidden sm:block text-[9px] uppercase tracking-wider opacity-60">Ordering from</span>
          <span className="block text-xs font-semibold truncate">{current?.display_name || location}</span>
        </span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`shrink-0 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="listbox" className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-cream/10 bg-ink shadow-2xl shadow-black/50 p-2 z-50">
          {locations.map((loc) => {
            const active = loc.location === location;
            return (
              <button
                key={loc.location}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  if (switchTo(loc.location)) setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors ${
                  active ? 'bg-cream/[0.08] text-gold' : 'text-cream/80 hover:bg-cream/[0.06]'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{loc.display_name || loc.location}</span>
                  {active && <span aria-hidden="true" className="text-xs">✓</span>}
                </span>
                {loc.display_address && (
                  <span className="block text-[11px] opacity-60 mt-0.5">{loc.display_address}</span>
                )}
                {loc.status_label && (
                  <span className="block text-[10px] uppercase tracking-wider opacity-50 mt-1">{loc.status_label}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LocationGate() {
  const { locations, needsChoice, setLocation } = useLocation();

  if (!needsChoice) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="location-gate-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-3xl border border-cream/10 bg-ink p-6 shadow-2xl">
        <h2 id="location-gate-title" className="font-serif font-bold text-2xl text-cream mb-1.5">
          Which store?
        </h2>
        <p className="text-cream/60 text-sm mb-5">
          Menus and prices are set by each restaurant, so pick where you&rsquo;d like to order from.
        </p>
        <div className="space-y-2">
          {locations.map((loc) => (
            <button
              key={loc.location}
              type="button"
              onClick={() => setLocation(loc.location)}
              className="w-full text-left px-4 py-3.5 rounded-2xl border border-cream/10 hover:border-gold/50 hover:bg-cream/[0.05] transition-colors"
            >
              <span className="block text-sm font-semibold text-cream">{loc.display_name || loc.location}</span>
              {loc.display_address && (
                <span className="block text-[11px] text-cream/55 mt-0.5">{loc.display_address}</span>
              )}
              {loc.status_label && (
                <span className="block text-[10px] uppercase tracking-wider text-gold/70 mt-1">{loc.status_label}</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-cream/35 text-[11px] mt-4">You can change this any time from the header.</p>
      </div>
    </div>
  );
}

export default LocationPicker;
