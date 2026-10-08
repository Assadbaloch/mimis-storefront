import Link from 'next/link';
import JsonLd from '@/components/seo/JsonLd';
import { BRAND, buildFaqs, faqJsonLd, getSeoStores, getMenuCategories } from '@/lib/seo';
import { DEFAULT_LOCATION } from '@/lib/locationServer';

// Frequently asked questions (2026-10-09), marked up as FAQPage so search
// engines and AI assistants can quote the answers. Answers are built from live
// store data in lib/seo.js -- no hours, prices or promises are hardcoded here.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: `FAQ | ${BRAND}`,
  description: `Answers about ${BRAND}: halal, locations in Madison Heights and Warren, online ordering, delivery, payment and rewards.`,
  alternates: { canonical: '/faq' },
};

export default async function FaqPage() {
  const stores = await getSeoStores();
  const categories = await getMenuCategories(DEFAULT_LOCATION);
  const faqs = buildFaqs(stores, categories);

  return (
    <div className="px-5 md:px-8 py-16 md:py-24">
      <JsonLd data={faqJsonLd(faqs)} />
      <div className="max-w-3xl mx-auto">
        <p className="section-label mb-3">{BRAND}</p>
        <h1 className="font-serif font-bold text-4xl md:text-5xl text-app">Frequently asked questions</h1>
        <div className="mt-10 divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="py-5 group">
              <summary className="cursor-pointer font-semibold text-app text-lg list-none flex justify-between gap-4">
                <span>{f.q}</span>
                <span aria-hidden="true" className="text-app-soft group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-app-soft mt-3">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-10 text-app-soft">
          Order from{' '}
          {stores.map((s, i) => (
            <span key={s.slug}>
              {i ? ' or ' : ''}
              <Link href={`/${s.slug}`} className="underline underline-offset-4 text-app">{s.city}</Link>
            </span>
          ))}
          .
        </p>
      </div>
    </div>
  );
}
