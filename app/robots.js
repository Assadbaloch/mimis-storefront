import { SITE_URL } from '@/lib/seo';

// /robots.txt (2026-10-09). Every crawler -- Google, Bing, and the AI search
// crawlers (OpenAI, Perplexity, Anthropic, Apple, Google AI) -- may read the
// whole public site. Only admin, API and the per-customer shop steps (cart,
// checkout, order tracking) are left out of search. This only guides crawlers;
// it blocks nothing for customers, Clover or Uber.
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/cart', '/checkout', '/order-status', '/order-confirmed'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
