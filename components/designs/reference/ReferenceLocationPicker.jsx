'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from '@/lib/location';
import { useLocationSwitch } from '@/components/LocationPicker';

// Store switcher for the reference header.
//
// NOT in the reference design -- added deliberately. The reference was a
// marketing site with one notional menu; this storefront has two restaurants on
// separate Clover accounts with different menus and different prices. Without a
// visible switcher a customer who lands on the wrong store has no way to change
// it except by finding an "Order from ..." button further down the page.
//
// The switching logic is imported, not rewritten: useLocationSwitch owns the
// rule that changing store empties the basket (cart lines are keyed by
// clover_item_id, which differs per merchant, so carrying them across would
// send the wrong ids to Clover at checkout). Only the presentation is local.

export default function ReferenceLocationPicker({ className = '' }) {
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

  // One store: nothing to switch between, so no control.
  if (locations.length < 2) return null;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Ordering from ${current?.display_name || location}`}
        className="flex items-center gap-1.5 text-left rounded-full px-2 sm:px-3 py-1.5 min-w-0 max-w-[42vw] sm:max-w-none border border-[rgba(29,32,33,0.12)] dark:border-white/10 bg-[#EAE4D5] dark:bg-[#2a1a12] text-[#1D2021] dark:text-[#f5ebd7] hover:border-[#C8102E]/40 dark:hover:border-[#e6b95c]/40 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#C8102E] dark:text-[#e6b95c]">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="leading-tight min-w-0">
          <span className="hidden sm:block text-[8px] uppercase tracking-[0.15em] font-bold opacity-60">Ordering from</span>
          <span className="block text-[11px] font-bold uppercase tracking-wider truncate">{current?.display_name || location}</span>
        </span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`shrink-0 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-[rgba(29,32,33,0.12)] dark:border-white/10 bg-[#FFF9EC] dark:bg-[#1a0f0a] shadow-[0_20px_40px_rgba(29,32,33,0.18)] p-2 z-50"
        >
          {locations.map((loc) => {
            const active = loc.location === location;
            return (
              <button
                key={loc.location}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { if (switchTo(loc.location)) setOpen(false); }}
                className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors ${
                  active
                    ? 'bg-[#C8102E]/10 text-[#C8102E] dark:bg-[#e6b95c]/10 dark:text-[#e6b95c]'
                    : 'text-[#1D2021] hover:bg-[#EAE4D5] dark:text-[#f5ebd7]/80 dark:hover:bg-white/5'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{loc.display_name || loc.location}</span>
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
          <p className="text-[10px] px-3.5 pt-2 pb-1 text-[#5F625F] dark:text-[#f5ebd7]/40">
            Each kitchen has its own menu and prices.
          </p>
        </div>
      )}
    </div>
  );
}
