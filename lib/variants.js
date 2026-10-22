// One menu card per dish, with the size chosen inside it (owner, 2026-10-23:
// "a specific type of pizza should only show once", like Slice).
//
// PRESENTATION ONLY. Clover keeps every size as its own item (its own id,
// name and price), and nothing here changes that: the customer still picks
// one real Clover item, the cart line carries that item's id and full Clover
// name ("Mimi's Yummy Pizza (M 12\")"), and the server prices it as before.
// Only the menu grid shows the sizes of one dish together.

// Sizes Clover puts at the end of a name: (M 12"), (L 14"), (XL 16"),
// (Medium 12"), (Large 14"), and piece counts (6 Pcs), (12 Pcs).
const SIZE_RE = /\s*\(\s*(m|med|medium|l|lg|large|xl|x-large|extra large)\s*(\d+)\s*"?\s*\)\s*$/i;
const PCS_RE = /\s*\(\s*(\d+)\s*pcs?\s*\)\s*$/i;
const SIZE_WORD = { m: 'Medium', med: 'Medium', medium: 'Medium', l: 'Large', lg: 'Large', large: 'Large', xl: 'X-Large', 'x-large': 'X-Large', 'extra large': 'X-Large' };

export function parseSize(rawName) {
  const name = String(rawName || '').trim();
  let m = name.match(SIZE_RE);
  if (m) {
    const inches = Number(m[2]);
    return { base: name.slice(0, m.index).trim(), label: `${SIZE_WORD[m[1].toLowerCase()]} ${inches}"`, rank: inches };
  }
  m = name.match(PCS_RE);
  if (m) {
    const n = Number(m[1]);
    return { base: name.slice(0, m.index).trim(), label: `${n} pcs`, rank: n };
  }
  return null;
}

// Soft drinks are separate Clover items by container (Can, 16.9oz Soda,
// Glass Bottle, 2 Ltr Soda). On the website they show as one "Soda" card and
// the customer picks the container inside it; each container keeps its own
// Clover item, price and flavour choices. Labels are Clover's own names.
const SODA_RE = /^(can|\d+(\.\d+)?\s*oz\s+soda|glass bottle|\d+\s*(ltr|liter|litre|l)\s+soda)$/i;
export function parseKind(item) {
  const name = String(item?.name || '').trim();
  if (/drink/i.test(item?.category || '') && SODA_RE.test(name)) {
    return { base: 'Soda', label: name, rank: Number(item.price_cents) || 0, kind: 'type' };
  }
  return parseSize(name);
}

// Clover's numbering is not written the same way on every size
// ("7. BBQ Chicken", "7.BBQ Chicken", "8 Spicy Chicken"), so the key ignores it.
export function baseKey(base) {
  return String(base || '')
    .toLowerCase()
    .replace(/^\s*\d+\s*\.?\s*/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Leading Clover number, used to keep "1. Mimi's Yummy Pizza" first.
export function cloverNumber(rawName) {
  const m = String(rawName || '').match(/^\s*(\d+)\s*\.?\s/);
  return m ? Number(m[1]) : null;
}

// Categories named after a size ("MED 12\" Pizzas", "LG 14\"", "XL 16\"").
const SIZE_CATEGORY = /^\s*(med|medium|lg|large|xl|x-large|sm|small)\b[^a-z]*\d+\s*"/i;
export function isSizeCategory(cat) {
  return SIZE_CATEGORY.test(String(cat || ''));
}
export const SIZED_SECTION = 'Pizzas';

// items: the rows the menu page shows (already filtered). Returns rows where
// every dish sold in two or more sizes is one row with `variants` (smallest
// first). Single-size rows are returned unchanged.
export function groupSizes(items) {
  const groups = new Map();
  const out = [];
  for (const item of items) {
    const p = parseKind(item);
    if (!p) { out.push(item); continue; }
    const key = (p.kind === 'type' ? 'type:' : '') + baseKey(p.base);
    if (!groups.has(key)) {
      groups.set(key, { key, base: p.base, kind: p.kind || 'size', rows: [] });
      out.push(groups.get(key)); // placeholder keeps the first position
    }
    const g = groups.get(key);
    // The same size twice (two Clover items) cannot be told apart: keep both
    // as separate cards rather than hide one.
    if (g.rows.some((r) => r.size.rank === p.rank)) { out.push(item); continue; }
    g.rows.push({ ...item, size: p });
    // Prefer the name written "N. Dish" (some sizes say "N Dish" or "N.Dish").
    if (!/^\d+\.\s/.test(g.base) && /^\d+\.\s/.test(p.base)) g.base = p.base;
  }
  const result = [];
  for (const entry of out) {
    if (!entry.rows) { result.push(entry); continue; }
    if (entry.rows.length < 2) {
      const { size, ...only } = entry.rows[0];
      result.push(only);
      continue;
    }
    const variants = [...entry.rows].sort((a, b) => a.size.rank - b.size.rank).map((r) => {
      const { size, ...v } = r;
      return { ...v, size_label: size.label };
    });
    const first = variants[0];
    const prices = variants.map((v) => v.price_cents || v.from_price_cents || 0).filter((c) => c > 0);
    if (!prices.length) { variants.forEach((v) => result.push(v)); continue; }
    // Section: a category that is not a size name, if Clover gave one
    // (Madison Heights: "Specialty Pizzas", "Regular Pizza"); otherwise the
    // shared pizza section.
    const named = variants.map((v) => (v.category || '').trim()).find((c) => c && !isSizeCategory(c));
    const withImage = variants.find((v) => v.image_url || v.video_url) || first;
    result.push({
      ...first,
      // The group's own key; the card and sheet never send this to the cart.
      group_key: entry.key,
      name: entry.base,
      category: named || SIZED_SECTION,
      image_url: withImage.image_url,
      video_url: withImage.video_url,
      badge_text: variants.map((v) => v.badge_text).find(Boolean) || null,
      // Drinks: each container has its own description (a can is not a 2 litre),
      // so the card shows none and the sheet shows the picked one's.
      description_override: entry.kind === 'type' ? null : variants.map((v) => v.description_override).find(Boolean) || null,
      price_cents: Math.min(...prices),
      needs_choice: true,
      variant_kind: entry.kind,
      variants,
    });
  }
  // Single-size rows left in a size-named category join the shared section
  // when that section exists (Warren: Build Your Own (Medium 12"), Chicago
  // Style (Large 14")), so no near-empty size section is left behind.
  const hasShared = result.some((r) => r.variants && r.category === SIZED_SECTION);
  return result.map((r) => (!r.variants && hasShared && isSizeCategory(r.category) ? { ...r, category: SIZED_SECTION } : r));
}

// Within a section, Clover's numbered dishes in Clover's order first
// ("1. Mimi's Yummy Pizza", "2. Veggie Pizza", …), then the rest as before.
export function sortByCloverNumber(items) {
  return items
    .map((it, i) => ({ it, i, n: cloverNumber(it.name) }))
    .sort((a, b) => {
      if (a.n != null && b.n != null) return a.n - b.n || a.i - b.i;
      if (a.n != null) return -1;
      if (b.n != null) return 1;
      return a.i - b.i;
    })
    .map((x) => x.it);
}
