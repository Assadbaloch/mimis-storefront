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
