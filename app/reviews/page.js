import { notFound } from 'next/navigation';
import { getActiveDesign } from '@/lib/design';
import ReviewsContent from '@/components/designs/reference/ReviewsContent';

// Only reachable while the reference design is live: the original design has no
// reviews page and no link to one.

export const dynamic = 'force-dynamic';
export const metadata = { title: "Reviews | Mimi's Pizza & Burger" };

export default async function ReviewsPage() {
  if ((await getActiveDesign()) !== 'reference') notFound();
  return <ReviewsContent />;
}
