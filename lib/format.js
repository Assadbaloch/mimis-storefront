export function formatPrice(cents) {
  return '$' + (cents / 100).toFixed(2);
}

// Clover item names sometimes carry internal POS ordering prefixes like
// "1.Mimi's Yummy Pizza" or "15.Meat Lovers Pizza" — strip for customer display.
// Never written back to the DB; Clover still owns the raw `name` field.
export function displayName(rawName) {
  if (!rawName) return '';
  return rawName.trim().replace(/^\d+\.\s*/, '');
}

// A badge is a short label ("HOT", "NEW", "BEST SELLER"). Anything that looks
// like a link or a pasted file name is not a badge -- one product had an image
// URL pasted into the field and the menu card printed the whole URL over the
// photo. Such values are never shown; the admin editors also refuse them.
export const BADGE_MAX = 40; // input limit; the longest real badge today is 34
export function cleanBadge(raw) {
  const t = String(raw || '').trim();
  if (!t) return '';
  // Only link- or file-shaped text is refused. "GRAB & GO", "50% OFF" and
  // emoji badges are normal and stay.
  if (/:\/\/|www\.|\/_next\/|\?[a-z_]+=|\.(png|jpe?g|webp|gif|svg|avif)(\b|$)/i.test(t)) return '';
  if (t.length > 60) return '';
  return t;
}

export function displayCategory(rawCategory) {
  const trimmed = (rawCategory || '').trim();
  const overrides = { Uncategorized: 'More Favorites' };
  return overrides[trimmed] || trimmed;
}

const CATEGORY_ORDER = [
  '12" Medium Pizzas',
  'Specialty Pizza',
  'Pizza and Bread',
  'Appetizers',
  'Wing Dings',
  'Burgers',
  'Sub/Sandwiches 8"',
  'Gyro Sandwiches',
  'Fresh Garden Salad',
  'Dipping Sause',
  'Desserts',
  'Cold Drinks',
  'Uncategorized',
];

export function categorySortIndex(rawCategory) {
  const trimmed = (rawCategory || '').trim();
  const idx = CATEGORY_ORDER.indexOf(trimmed);
  return idx === -1 ? CATEGORY_ORDER.length : idx;
}
