import { Suspense } from 'react';
import OrderStatusView from '@/components/OrderStatusView';

export default function OrderStatusPage() {
  return (
    <Suspense fallback={<p className="text-center text-app-soft py-24">Loading&hellip;</p>}>
      {/* requireActive: this page is reached deliberately ("where's my food?"),
          so it must not resurrect an abandoned, never-paid checkout from
          localStorage. /order-confirmed deliberately does not set this — it is
          shown straight after checkout, where an unpaid order still needs to
          be visible so the customer can finish paying. */}
      <OrderStatusView heading="Track Your Order" requireActive />
    </Suspense>
  );
}
