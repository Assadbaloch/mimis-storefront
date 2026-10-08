import { SITE_URL, BRAND, HALAL_LINE, STORE_PAGES, buildFaqs, getSeoStores, getMenuCategories } from '@/lib/seo';
import { DEFAULT_LOCATION } from '@/lib/locationServer';

// /llms.txt (2026-10-09): a plain-text summary of the restaurant for AI
// assistants and AI search (the llms.txt convention), built from the same live
// data as the store pages and FAQ.
export const revalidate = 3600;

export async function GET() {
  const stores = await getSeoStores();
  const categories = await getMenuCategories(DEFAULT_LOCATION).catch(() => []);
  const faqs = buildFaqs(stores, categories);

  const lines = [
    `# ${BRAND}`,
    '',
    `> Pizza, burgers, wings and more, ${HALAL_LINE}, with two locations in Michigan (Madison Heights and Warren). Order online at ${SITE_URL} for pickup or delivery.`,
    '',
    '## Locations',
    ...stores.map((s) => `- [${BRAND} ${s.city}](${s.url}): ${s.address}. Phone ${s.phoneDisplay}. Menu: ${s.menuUrl}`),
    '',
    '## Order online',
    `- [Menu and online ordering](${SITE_URL}/menu): choose a store, add items and options, pay by card (Apple Pay and Google Pay accepted) for pickup or delivery.`,
    ...STORE_PAGES.map((p) => `- [${p.location} menu with prices](${SITE_URL}/${p.slug}/menu)`),
    `- [Rewards](${SITE_URL}/rewards): earn points on orders with your phone number.`,
    '',
    '## FAQ',
    ...faqs.flatMap((f) => [`### ${f.q}`, f.a, '']),
    `More: ${SITE_URL}/faq`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
