import { Suspense } from 'react';
import OrderStatusView from '@/components/OrderStatusView';

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={<p className="text-center text-app-soft py-24">Loading&hellip;</p>}>
      <OrderStatusView heading="Order Confirmed" />
    </Suspense>
  );
}
