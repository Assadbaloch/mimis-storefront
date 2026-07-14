import { Suspense } from 'react';
import OrderStatusView from '@/components/OrderStatusView';

export default function OrderStatusPage() {
  return (
    <Suspense fallback={<p className="text-center text-cream/50 py-24">Loading&hellip;</p>}>
      <OrderStatusView heading="Track Your Order" />
    </Suspense>
  );
}
