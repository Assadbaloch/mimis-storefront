'use client';
// Item options (half & half, toppings by side, crust, remove, sizes) exactly
// as Clover defines them. Names, prices and group order come straight from
// menu_items.modifiers (synced from Clover hourly) -- nothing here renames or
// re-prices anything. The only rules are the ones Clover leaves undefined, and
// they MUST stay identical to mimis.price_online_items() on the server (which
// prices every order; this file only drives the screen):
//   * one choice per single-choice group (same regex as the server/voice agent)
//   * Crust Type + Deep Dish Extra Large count as one crust choice
//   * an item whose own price is $0 needs one size/quantity choice
import { useEffect, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';

export const SINGLE_CHOICE = /crust|deep dish|size|quantity|type|dressing|jarrito|faygo|half\s*\/\s*half/i;
export const CRUST = /crust|deep dish/i;
export const REQUIRED_WHEN_FREE = /size|quantity/i;

export function optionGroups(item) {
  const groups = Array.isArray(item?.modifiers) ? item.modifiers : [];
  return groups
    .filter((g) => Array.isArray(g?.modifiers) && g.modifiers.length > 0)
    .map((g) => ({
      id: g.group_id || g.group_name,
      name: g.group_name || '',
      single: SINGLE_CHOICE.test(g.group_name || ''),
      crust: CRUST.test(g.group_name || ''),
      required: (item.price_cents || 0) === 0 && REQUIRED_WHEN_FREE.test(g.group_name || ''),
      options: g.modifiers
        .filter((o) => o && (o.clover_modifier_id || o.name))
        .map((o) => ({ id: o.clover_modifier_id || o.name, name: o.name || '', price_cents: Number(o.price_cents) || 0 })),
    }));
}

export function hasOptions(item) {
  return optionGroups(item).length > 0;
}

// Needs the options sheet before it can go in the basket ($0 base price).
export function needsChoice(item) {
  if (item?.needs_choice) return true; // precomputed by the menu page
  return (item?.price_cents || 0) === 0 && optionGroups(item).some((g) => g.required);
}

// Lowest possible price, for "from $X" on $0 items.
export function fromPrice(item) {
  if ((item?.price_cents || 0) > 0) return item.price_cents;
  if (item?.from_price_cents) return item.from_price_cents;
  const req = optionGroups(item).filter((g) => g.required);
  const mins = req.map((g) => Math.min(...g.options.map((o) => o.price_cents)));
  return mins.length ? Math.min(...mins) : 0;
}

// Toggle one option, honouring single-choice groups and the crust family.
export function toggleOption(item, selected, groupId, optionId) {
  const groups = optionGroups(item);
  const group = groups.find((g) => g.id === groupId);
  if (!group) return selected;
  const has = selected.includes(optionId);
  if (has) return selected.filter((id) => id !== optionId);
  let next = [...selected];
  if (group.single) {
    const ids = new Set(group.options.map((o) => o.id));
    next = next.filter((id) => !ids.has(id));
  }
  if (group.crust) {
    const crustIds = new Set(groups.filter((g) => g.crust).flatMap((g) => g.options.map((o) => o.id)));
    next = next.filter((id) => !crustIds.has(id));
  }
  next.push(optionId);
  return next;
}

// Chosen options in Clover's order, with Clover's names and prices.
export function chosenOptions(item, selected) {
  const out = [];
  for (const g of optionGroups(item)) {
    for (const o of g.options) {
      if (selected.includes(o.id)) {
        out.push({ name: o.name, price_cents: o.price_cents, group: g.name, clover_modifier_id: o.id });
      }
    }
  }
  return out;
}

export function unitPrice(item, selected) {
  return (item?.price_cents || 0) + chosenOptions(item, selected).reduce((s, o) => s + o.price_cents, 0);
}

// Returns a message when the selection cannot be ordered yet, else null.
export function selectionProblem(item, selected) {
  for (const g of optionGroups(item)) {
    if (g.required && !g.options.some((o) => selected.includes(o.id))) return `Choose ${g.name.toLowerCase()}`;
  }
  if (unitPrice(item, selected) <= 0) return 'Choose an option';
  return null;
}

// ---- settings + lazy option loading ---------------------------------------

let settingsPromise = null;
export function fetchOrderingSettings() {
  if (!settingsPromise) {
    settingsPromise = getSupabasePublicClient()
      .from('online_ordering_settings')
      .select('options_enabled')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => ({ optionsEnabled: data?.options_enabled === true }))
      .catch(() => ({ optionsEnabled: false }));
  }
  return settingsPromise;
}

// Staff preview before switching options on for everyone: open any page with
// ?options_preview=1 (remembered in this browser; ?options_preview=0 clears it).
// The server still prices and validates every order either way.
function previewOn() {
  try {
    const q = new URLSearchParams(window.location.search).get('options_preview');
    if (q === '1') window.localStorage.setItem('mimis_options_preview', '1');
    if (q === '0') window.localStorage.removeItem('mimis_options_preview');
    return window.localStorage.getItem('mimis_options_preview') === '1';
  } catch { return false; }
}

export function useOptionsEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let live = true;
    if (previewOn()) { setEnabled(true); return () => { live = false; }; }
    fetchOrderingSettings().then((s) => { if (live) setEnabled(s.optionsEnabled); });
    return () => { live = false; };
  }, []);
  return enabled;
}

// Menu cards on some pages load without option data; fetch it when needed.
export function useItemModifiers(item) {
  const [mods, setMods] = useState(Array.isArray(item?.modifiers) ? item.modifiers : null);
  useEffect(() => {
    if (Array.isArray(item?.modifiers) || (!item?.id && !item?.clover_item_id)) return;
    let live = true;
    let q = getSupabasePublicClient().from('menu_items').select('modifiers');
    // clover_item_id is unique per Clover merchant, so it identifies the store too.
    q = item.id ? q.eq('id', item.id) : q.eq('clover_item_id', item.clover_item_id).eq('available', true);
    q.limit(1)
      .maybeSingle()
      .then(({ data }) => { if (live) setMods(Array.isArray(data?.modifiers) ? data.modifiers : []); });
    return () => { live = false; };
  }, [item?.id, item?.clover_item_id, item?.modifiers]);
  return mods;
}
