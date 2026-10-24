'use client';
import { useLocation } from '@/lib/location';
import { useStoreStatus } from '@/lib/useStoreStatus';
import { opensSentence } from '@/lib/storeHours';

// Menu notice while the store is closed or the kitchen has paused orders
// (claude/PREORDER_SPEC.md §5). Pre-orders on: "...You can pre-order for later."
// Pre-orders off: just closed and when it opens (the website takes no orders then).
export default function StoreClosedNotice() {
  const { location } = useLocation();
  const status = useStoreStatus(location);
  if (!status) return null;
  if (!status.preorders_enabled) {
    if (!status.has_hours || status.open_now) return null;
    return (
      <div className="container mx-auto px-5 mt-4">
        <div className="rounded-app border border-highlight-line bg-highlight-wash px-4 py-3" role="status">
          <p className="text-app font-semibold text-sm">We&rsquo;re closed right now. {opensSentence(status)}</p>
          <p className="text-app-soft text-sm">Online ordering opens when we do.</p>
        </div>
      </div>
    );
  }
  if (status.paused) {
    return (
      <div className="container mx-auto px-5 mt-4">
        <div className="rounded-app border border-line bg-surface px-4 py-3" role="status">
          <p className="text-app font-semibold text-sm">We&rsquo;re not taking orders for a short while.</p>
          <p className="text-app-soft text-sm">Please try again soon.</p>
        </div>
      </div>
    );
  }
  if (status.open_now) return null;
  return (
    <div className="container mx-auto px-5 mt-4">
      <div className="rounded-app border border-highlight-line bg-highlight-wash px-4 py-3" role="status">
        <p className="text-app font-semibold text-sm">We&rsquo;re closed right now. {opensSentence(status)}</p>
        <p className="text-app-soft text-sm">You can pre-order for later.</p>
      </div>
    </div>
  );
}
