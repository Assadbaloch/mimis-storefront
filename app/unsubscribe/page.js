import { Suspense } from 'react';
import UnsubscribeView from '@/components/UnsubscribeView';

export const metadata = {
  title: "Unsubscribe | Mimi's Pizza & Burgers",
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<p className="text-center text-app-soft py-24">Loading&hellip;</p>}>
      <UnsubscribeView />
    </Suspense>
  );
}
