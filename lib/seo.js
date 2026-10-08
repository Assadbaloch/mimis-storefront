import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { displayName, displayCategory, categorySortIndex } from '@/lib/format';

// Search and AI discoverability (2026-10-09).
//
// Everything search engines and AI assistants (Google, Bing/Copilot, ChatGPT,
// Perplexity, Apple) read about the restaurant comes from here: the store
// facts, the per-store menu, and the schema.org JSON-LD that describes them.
// One source, so the store pages, the FAQ, the sitemap and llms.txt can never
// disagree with each other or with what the location picker and checkout use
// (mimis.store_locations / mimis.menu_items).
//
// Read-only. Nothing here is used by ordering, cart, checkout or payments.
//
// Opening hours are deliberately NOT published yet: mimis.store_hours still
// holds the 2026-08-10 placeholder (09:00-20:00 / 09:00-22:00) until the owner
// saves the real hours in the dashboard, and wrong hours in structured data
// would contradict the Google business profiles. Add them here (from
// store_hours) once they are real.

export const SITE_URL = (process.env.CANONICAL_ORIGIN || 'https://www.mimispizzami.com').replace(/\/+$/, '');
export const BRAND = "Mimi's Pizza & Burgers";
export const HALAL_LINE = '100% Zabiha Halal, certified by HFSAA';

// Public store pages. The slug is the URL; the location is the key used in
// mimis.store_locations / menu_items. A store not listed here gets no page.
export const STORE_PAGES = [
  { slug: 'madison-heights', location: 'Madison Heights' },
  { slug: 'warren', location: 'Warren' },
];

export function slugForLocation(location) {
  return STORE_PAGES.find((s) => s.location === location)?.slug || null;
}

export function formatPhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  if (ten.length !== 10) return String(raw || '');
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

function e164(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  return '';
}

function normalizeStore(row) {
  const slug = slugForLocation(row.location);
  const street = [row.address_line1, row.address_line2].filter(Boolean).join(', ');
  const cityLine = [row.city, [row.state, row.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const address = row.display_address || [street, cityLine].filter(Boolean).join(', ');
  const phone = e164(row.display_phone || row.phone);
  return {
    location: row.location,
    slug,
    url: slug ? `${SITE_URL}/${slug}` : SITE_URL,
    menuUrl: slug ? `${SITE_URL}/${slug}/menu` : `${SITE_URL}/menu`,
    name: row.name || BRAND,
    city: row.city || row.location,
    state: row.state || 'MI',
    postalCode: row.postal_code || '',
    street,
    address,
    phone,
    phoneDisplay: formatPhone(phone),
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${row.name || BRAND} ${address}`)}`,
  };
}

const STORE_COLUMNS = 'location, name, display_name, display_address, display_phone, phone, address_line1, address_line2, city, state, postal_code, lat, lng';

// Stores that have a public page, in STORE_PAGES order. [] if the read fails.
export async function getSeoStores() {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase.from('store_locations').select(STORE_COLUMNS);
  if (error || !Array.isArray(data)) {
    console.error('getSeoStores', error?.message);
    return [];
  }
  return STORE_PAGES
    .map((p) => data.find((r) => r.location === p.location))
    .filter(Boolean)
    .map(normalizeStore);
}

export async function getSeoStore(slug) {
  const stores = await getSeoStores();
  return stores.find((s) => s.slug === slug) || null;
}

// The store's menu, with exactly the visibility rules of /menu (app/menu/page.js
// getMenu): an item is listed when it has a price, or -- while the options sheet
// is on -- when its whole price is a Clover size choice ("from $X").
export async function getStoreMenu(location) {
  const supabase = getSupabasePublicClient();
  const { data: settings } = await supabase
    .from('online_ordering_settings').select('options_enabled').eq('id', 1).maybeSingle();
  const optionsEnabled = settings?.options_enabled === true;

  const { data: rows, error } = await supabase
    .from('menu_items')
    .select('clover_item_id, name, category, price_cents, image_url, description_override, sort_order, modifiers')
    .eq('available', true)
    .eq('location', location)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getStoreMenu', error.message);
    return [];
  }

  const byCategory = new Map();
  for (const row of rows || []) {
    const item = {
      id: row.clover_item_id,
      name: displayName(row.name),
      description: row.description_override || '',
      image: row.image_url || '',
      price_cents: Number(row.price_cents) || 0,
      from_price_cents: null,
    };
    if (item.price_cents <= 0) {
      if (!optionsEnabled) continue;
      const sizeGroups = (Array.isArray(row.modifiers) ? row.modifiers : []).filter(
        (g) => /size|quantity/i.test(g?.group_name || '') && (g.modifiers || []).some((o) => Number(o.price_cents) > 0)
      );
      if (!sizeGroups.length) continue;
      const prices = sizeGroups.flatMap((g) => g.modifiers.map((o) => Number(o.price_cents) || 0)).filter((p) => p > 0);
      item.from_price_cents = Math.min(...prices);
    }
    if (!item.name) continue;
    const key = (row.category || '').trim() || 'Uncategorized';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(item);
  }

  return Array.from(byCategory.entries())
    .map(([key, items]) => ({ key, label: displayCategory(key), items }))
    .sort((a, b) => categorySortIndex(a.key) - categorySortIndex(b.key));
}

export function priceLabel(item) {
  const cents = item.price_cents > 0 ? item.price_cents : item.from_price_cents;
  if (!cents) return '';
  return `${item.price_cents > 0 ? '' : 'from '}$${(cents / 100).toFixed(2)}`;
}

// ── schema.org JSON-LD ────────────────────────────────────────────────────

const ORG_ID = `${SITE_URL}/#organization`;
const LOGO = `${SITE_URL}/icons/icon-512.png`;

export function restaurantId(store) {
  return `${store.url}#restaurant`;
}

export function restaurantJsonLd(store) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': restaurantId(store),
    name: store.name,
    alternateName: ["Mimi's Pizza", `Mimi's Pizza ${store.city}`],
    description: `Pizza, burgers, wings and more in ${store.city}, Michigan, ${HALAL_LINE}. Order online for pickup or delivery.`,
    url: store.url,
    image: LOGO,
    logo: LOGO,
    telephone: store.phone || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: store.street || undefined,
      addressLocality: store.city,
      addressRegion: store.state,
      postalCode: store.postalCode || undefined,
      addressCountry: 'US',
    },
    hasMap: store.mapUrl,
    servesCuisine: ['Pizza', 'Burgers', 'Wings', 'Halal'],
    priceRange: '$$',
    acceptsReservations: false,
    hasMenu: store.menuUrl,
    parentOrganization: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: store.url,
        actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'],
      },
    },
  };
  if (store.lat != null && store.lng != null) {
    ld.geo = { '@type': 'GeoCoordinates', latitude: store.lat, longitude: store.lng };
  }
  return ld;
}

export function siteJsonLd(stores) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: BRAND,
        url: SITE_URL,
        logo: LOGO,
        subOrganization: stores.map((s) => ({ '@id': restaurantId(s) })),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: BRAND,
        publisher: { '@id': ORG_ID },
      },
      ...stores.map((s) => {
        const { '@context': _c, ...r } = restaurantJsonLd(s);
        return r;
      }),
    ],
  };
}

export function menuJsonLd(store, groups) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${store.menuUrl}#menu`,
    name: `${BRAND} ${store.city} menu`,
    url: store.menuUrl,
    inLanguage: 'en-US',
    hasMenuSection: groups.map((g) => ({
      '@type': 'MenuSection',
      name: g.label,
      hasMenuItem: g.items.map((i) => ({
        '@type': 'MenuItem',
        name: i.name,
        description: i.description || undefined,
        image: i.image || undefined,
        suitableForDiet: 'https://schema.org/HalalDiet',
        offers: i.price_cents > 0
          ? { '@type': 'Offer', price: (i.price_cents / 100).toFixed(2), priceCurrency: 'USD' }
          : { '@type': 'AggregateOffer', lowPrice: (i.from_price_cents / 100).toFixed(2), priceCurrency: 'USD' },
      })),
    })),
  };
}

export function faqJsonLd(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

// Frequently asked questions, built from live store data. Used by /faq (page +
// FAQPage JSON-LD) and llms.txt. Only facts the system or the site already
// states: no hours (see the note at the top), no prices, no promises.
export function buildFaqs(stores, categories) {
  const where = stores.map((s) => `${s.city}: ${s.address}, ${s.phoneDisplay}`).join('. ');
  const what = categories.length
    ? `The menu includes ${categories.slice(0, 8).join(', ')}, and more. Each store's full menu with prices is on its menu page.`
    : "Each store's full menu with prices is on its menu page.";
  return [
    { q: "Is Mimi's Pizza & Burgers halal?", a: `Yes. Everything at Mimi's is ${HALAL_LINE}.` },
    { q: "Where are Mimi's Pizza & Burgers locations?", a: `${where}.` },
    { q: 'Can I order online?', a: "Yes. Order at mimispizzami.com for pickup or delivery from either store: choose your store, add your items and options, and pay securely at checkout." },
    { q: 'Do you deliver?', a: 'Yes. Choose Delivery at checkout and a courier brings your order from the store. Delivery covers roughly 8 to 10 miles around each store, and checkout confirms whether your address is in range before you pay.' },
    { q: 'How do I pay for an online order?', a: 'Online orders are paid by card at checkout, including Apple Pay and Google Pay. Your order goes to the kitchen as soon as the payment is confirmed.' },
    { q: 'Is the menu the same at both stores?', a: 'Each store sets its own menu and prices, so pick your store first and the menu shows exactly what that store offers.' },
    { q: 'What is on the menu?', a: what },
    { q: 'Do you have a rewards program?', a: "Yes. Join Mimi's Rewards with your phone number to earn points on your orders and redeem them for rewards. See the Rewards page for details." },
  ];
}

export async function getMenuCategories(location) {
  const groups = await getStoreMenu(location);
  return groups.map((g) => g.label).filter((l) => l && l !== 'More Favorites');
}
