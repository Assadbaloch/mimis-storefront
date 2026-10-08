import { StoreMenuPage, storeMenuMetadata } from '@/components/seo/StorePages';

// Readable, indexable menu for this store (see components/seo/StorePages.jsx).
export const dynamic = 'force-dynamic';

export function generateMetadata() {
  return storeMenuMetadata('warren');
}

export default function Page() {
  return <StoreMenuPage slug="warren" />;
}
