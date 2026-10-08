import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import OrderAtLocationLink from '@/components/designs/reference/OrderAtLocationLink';
import {
  BRAND, HALAL_LINE, getSeoStores, getStoreMenu, priceLabel,
  restaurantJsonLd, menuJsonLd,
} from '@/lib/seo';

// Public page per store (/madison-heights, /warren) and its readable menu
// (/madison-heights/menu, /warren/menu), added 2026-10-09 for search and AI
// discoverability.
//
// Why they exist: /menu and /menu/<id> pick the store from a cookie, so a
// search crawler (no cookie) only ever sees Madison Heights and every Warren
// item link answers 404. These pages carry the store in the URL, so each store
// is readable and indexable on its own. They add pages only: /menu, item pages,
// cart and checkout are untouched, and ordering still goes through them -- the
// Order button selects the store (same component as the Contact page) and
// opens /menu.

const BTN_PRIMARY = 'btn-primary inline-flex items-center justify-center';
const BTN_SECONDARY = 'btn-secondary inline-flex items-center justify-center';

async function loadStore(slug) {
  const stores = await getSeoStores();
  const store = stores.find((s) => s.slug === slug);
  return { store, others: stores.filter((s) => s.slug !== slug) };
}

export async function storeMetadata(slug) {
  const { store } = await loadStore(slug);
  if (!store) return { title: `${BRAND}` };
  const title = `${BRAND} ${store.city}, MI | Halal Pizza, Burgers & Wings`;
  const description = `Pizza, burgers, wings and more at ${store.address}, ${HALAL_LINE}. Order online for pickup or delivery, or call ${store.phoneDisplay}.`;
  return {
    title,
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: { title, description, url: `/${slug}`, siteName: BRAND, type: 'website' },
  };
}

export async function storeMenuMetadata(slug) {
  const { store } = await loadStore(slug);
  if (!store) return { title: `${BRAND}` };
  const title = `Menu | ${BRAND} ${store.city}, MI`;
  const description = `Full menu and prices at ${BRAND} in ${store.city}, Michigan: pizza, burgers, wings and more, ${HALAL_LINE}. Order online for pickup or delivery.`;
  return {
    title,
    description,
    alternates: { canonical: `/${slug}/menu` },
    openGraph: { title, description, url: `/${slug}/menu`, siteName: BRAND, type: 'website' },
  };
}

function StoreFacts({ store }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 text-left">
      <div>
        <dt className="section-label mb-1">Address</dt>
        <dd className="text-app">
          <a href={store.mapUrl} target="_blank" rel="noopener" className="underline underline-offset-4">{store.address}</a>
        </dd>
      </div>
      {store.phone ? (
        <div>
          <dt className="section-label mb-1">Phone</dt>
          <dd className="text-app"><a href={`tel:${store.phone}`} className="underline underline-offset-4">{store.phoneDisplay}</a></dd>
        </div>
      ) : null}
      <div>
        <dt className="section-label mb-1">Order</dt>
        <dd className="text-app-soft">Online for pickup or delivery. Delivery covers roughly 8&ndash;10 miles around the store; checkout confirms your address.</dd>
      </div>
      <div>
        <dt className="section-label mb-1">Halal</dt>
        <dd className="text-app-soft">{HALAL_LINE}.</dd>
      </div>
    </dl>
  );
}

export async function StoreLandingPage({ slug }) {
  const { store, others } = await loadStore(slug);
  if (!store) notFound();
  const groups = await getStoreMenu(store.location);
  const categories = groups.map((g) => g.label).filter((l) => l !== 'More Favorites');

  return (
    <div className="px-5 md:px-8 py-16 md:py-24">
      <JsonLd data={restaurantJsonLd(store)} />
      <div className="max-w-3xl mx-auto">
        <p className="section-label mb-3">{store.city}, Michigan</p>
        <h1 className="font-serif font-bold text-4xl md:text-5xl text-app">{BRAND} in {store.city}</h1>
        <p className="text-app-soft mt-4 text-lg">
          Pizza, burgers, wings and more, made fresh to order at {store.street || store.address}, {HALAL_LINE}.
          Order online for pickup or delivery.
        </p>

        <div className="flex flex-wrap gap-3 mt-8">
          <OrderAtLocationLink location={store.location} className={BTN_PRIMARY}>Order online from {store.city}</OrderAtLocationLink>
          <Link href={`/${store.slug}/menu`} className={BTN_SECONDARY}>See the {store.city} menu</Link>
          {store.phone ? <a href={`tel:${store.phone}`} className={BTN_SECONDARY}>Call {store.phoneDisplay}</a> : null}
        </div>

        <div className="mt-12 rounded-app border border-line p-6 md:p-8">
          <StoreFacts store={store} />
        </div>

        {categories.length ? (
          <section className="mt-12">
            <h2 className="font-serif font-bold text-2xl text-app">On the menu in {store.city}</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c} className="rounded-full border border-line px-3 py-1 text-sm text-app-soft">{c}</li>
              ))}
            </ul>
            <p className="mt-4">
              <Link href={`/${store.slug}/menu`} className="underline underline-offset-4 text-app">Full {store.city} menu with prices</Link>
            </p>
          </section>
        ) : null}

        <section className="mt-12 text-app-soft">
          <p>
            Questions about halal, delivery or rewards? See our <Link href="/faq" className="underline underline-offset-4 text-app">FAQ</Link>.
            {others.map((o) => (
              <span key={o.slug}> Also open in <Link href={`/${o.slug}`} className="underline underline-offset-4 text-app">{o.city}</Link>.</span>
            ))}
          </p>
        </section>
      </div>
    </div>
  );
}

export async function StoreMenuPage({ slug }) {
  const { store } = await loadStore(slug);
  if (!store) notFound();
  const groups = await getStoreMenu(store.location);

  return (
    <div className="px-5 md:px-8 py-16 md:py-24">
      <JsonLd data={{ ...restaurantJsonLd(store) }} />
      {groups.length ? <JsonLd data={menuJsonLd(store, groups)} /> : null}
      <div className="max-w-3xl mx-auto">
        <p className="section-label mb-3">
          <Link href={`/${store.slug}`} className="hover:underline">{BRAND} &middot; {store.city}</Link>
        </p>
        <h1 className="font-serif font-bold text-4xl md:text-5xl text-app">{store.city} menu</h1>
        <p className="text-app-soft mt-4">
          Prices at our {store.city} store, {store.address}. {HALAL_LINE}.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <OrderAtLocationLink location={store.location} className={BTN_PRIMARY}>Order online from {store.city}</OrderAtLocationLink>
          {store.phone ? <a href={`tel:${store.phone}`} className={BTN_SECONDARY}>Call {store.phoneDisplay}</a> : null}
        </div>

        {groups.length ? (
          groups.map((g) => (
            <section key={g.key} className="mt-12">
              <h2 className="font-serif font-bold text-2xl text-app border-b border-line pb-2">{g.label}</h2>
              <ul className="mt-4 space-y-4">
                {g.items.map((i) => (
                  <li key={i.id} className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-app">{i.name}</h3>
                      {i.description ? <p className="text-sm text-app-soft mt-1">{i.description}</p> : null}
                    </div>
                    <span className="text-app whitespace-nowrap font-semibold">{priceLabel(i)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="text-app-soft mt-12">The menu is temporarily unavailable. Please check back shortly.</p>
        )}
      </div>
    </div>
  );
}
