import { StoreLandingPage, storeMetadata } from '@/components/seo/StorePages';

// Public store page for search engines and AI assistants (see components/seo/StorePages.jsx).
export const dynamic = 'force-dynamic';

export function generateMetadata() {
  return storeMetadata('warren');
}

export default function Page() {
  return <StoreLandingPage slug="warren" />;
}
