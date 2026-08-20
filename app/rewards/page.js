import RewardsLookup from '@/components/RewardsLookup';
import { getActiveDesign } from '@/lib/design';
import ReferenceRewards from '@/components/designs/reference/ReferenceRewards';

// The loyalty system itself is unchanged either way -- ReferenceRewards renders
// the same <RewardsLookup /> inside the reference's page design. Only the
// surrounding layout differs.
export const dynamic = 'force-dynamic';

export default async function RewardsPage() {
  if ((await getActiveDesign()) === 'reference') return <ReferenceRewards />;
  return <RewardsLookup />;
}
