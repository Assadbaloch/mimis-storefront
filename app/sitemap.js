import { SITE_URL, STORE_PAGES, getStoreMenu } from '@/lib/seo';
import { DEFAULT_LOCATION } from '@/lib/locationServer';
import { getActiveDesign } from '@/lib/design';

// /sitemap.xml (2026-10-09): every public page, both stores' pages and menus,
// and every item page. Item pages (/menu/<clover_item_id>) resolve against the
// default store when there is no store cookie -- which is how a crawler arrives
// -- so only the default store's items are listed here; the other store's
// items are covered by its own menu page (/<store>/menu).
export const revalidate = 3600;

export default async function sitemap() {
  const now = new Date();
  const page = (path, priority, changeFrequency = 'weekly') => ({
    url: `${SITE_URL}${path}`, lastModified: now, changeFrequency, priority,
  });

  const entries = [
    page('', 1.0, 'daily'),
    page('/menu', 0.9, 'daily'),
    ...STORE_PAGES.flatMap((s) => [page(`/${s.slug}`, 0.9), page(`/${s.slug}/menu`, 0.8, 'daily')]),
    page('/faq', 0.6, 'monthly'),
    page('/rewards', 0.5, 'monthly'),
    page('/privacy', 0.2, 'yearly'),
    page('/terms', 0.2, 'yearly'),
  ];

  // /contact and /reviews exist only in the reference design.
  try {
    if ((await getActiveDesign()) === 'reference') {
      entries.push(page('/contact', 0.6, 'monthly'), page('/reviews', 0.5, 'weekly'));
    }
  } catch (_e) { /* leave them out rather than fail the sitemap */ }

  try {
    const groups = await getStoreMenu(DEFAULT_LOCATION);
    for (const g of groups) {
      for (const i of g.items) {
        if (i.id) entries.push(page(`/menu/${encodeURIComponent(i.id)}`, 0.5, 'weekly'));
      }
    }
  } catch (_e) { /* the pages above still go out */ }

  return entries;
}
