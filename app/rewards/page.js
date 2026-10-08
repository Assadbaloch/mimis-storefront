import RewardsLookup from '@/components/RewardsLookup';
import { getActiveDesign } from '@/lib/design';
import ReferenceRewards from '@/components/designs/reference/ReferenceRewards';

// The loyalty system itself is unchanged either way -- ReferenceRewards renders
// the same <RewardsLookup /> inside the reference's page design. Only the
// surrounding layout differs.
export const dynamic = 'force-dynamic';
export const metadata = {
  title: "Rewards | Mimi's Pizza & Burgers",
  description: "Join Mimi's Rewards with your phone number: earn points on your orders and redeem them for rewards.",
  alternates: { canonical: '/rewards' },
};

export default async function RewardsPage() {
  if ((await getActiveDesign()) === 'reference') return <ReferenceRewards />;
  return <RewardsLookup />;
}
