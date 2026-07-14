'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/format';
import NotificationOptIn from '@/components/NotificationOptIn';

const STATUS_LABEL = {
  pending_payment: 'Awaiting Payment',
  new: 'Received',
  in_progress: 'Being Prepared',
  ready: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const KITCHEN_STEPS = ['new', 'in_progress', 'ready', 'completed'];

// Delivery-specific progress steps (Uber Direct / DoorDash statuses)
const DELIVERY_STEPS = [
  { key: 'requested',        label: 'Finding courier' },
  { key: 'courier_assigned', label: 'Courier assigned' },
  { key: 'picked_up',        label: 'On the way' },
  { key: 'delivered',        label: 'Delivered' },
];
const DELIVERY_STEP_KEYS = DELIVERY_STEPS.map((s) => s.key);

function deliveryStepIndex(status) {
  return DELIVERY_STEP_KEYS.indexOf(status);
}

export default function OrderStatusView({ heading }) {
  const [order, setOrder] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const cancelledRef = useRef(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    cancelledRef.current = false;

    // Prefer ?order_id= URL param (used by SMS/email tracking links).
    // Fall back to localStorage for same-device post-checkout flow.
    const urlOrderId = searchParams.get('order_id');
    let oid = urlOrderId || null;

    if (!oid) {
      let stored;
      try {
        stored = JSON.parse(window.localStorage.getItem('mimis-last-order') || 'null');
      } catch {
        stored = null;
      }
      oid = stored?.order_id || null;
    }

    if (!oid) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    // If we got the order ID from the URL, persist it to localStorage so
    // page refreshes keep working without the param staying in the URL.
    if (urlOrderId) {
      try {
        window.localStorage.setItem('mimis-last-order', JSON.stringify({ order_id: urlOrderId }));
      } catch { /* ignore */ }
    }

    setOrderId(oid);

    const supabase = getSupabasePublicClient();

    async function fetchStatus() {
      const { data, error } = await supabase.rpc('get_order_status', { p_order_id: oid });
      if (cancelledRef.current) return;
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setNotFound(true);
      } else {
        setOrder(Array.isArray(data) ? data[0] : data);
      }
      setLoading(false);
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);

    // Supabase Realtime — instant delivery status updates.
    // anon SELECT policy added on mimis.deliveries (July 12 2026) so this
    // subscription works from the unauthenticated storefront.
    // We re-fetch the safe SECURITY DEFINER RPC on any change rather than
    // using the raw event payload directly.
    const channel = supabase
      .channel('delivery-' + oid)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'mimis',
          table: 'deliveries',
          filter: 'order_id=eq.' + oid,
        },
        () => { fetchStatus(); }
      )
      .subscribe();

    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [searchParams]);

  if (loading) {
    return <p className="text-center text-cream/50 py-24">Loading your order&hellip;</p>;
  }

  if (notFound || !order) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <h1 className="font-serif font-bold text-2xl text-cream mb-3">No recent order found</h1>
        <p className="text-cream/55 mb-8">
          We can only show the order placed from this device. Place an order to track it here.
        </p>
        <Link href="/menu" className="btn-primary">Browse the Menu</Link>
      </div>
    );
  }

  const kitchenStepIndex = KITCHEN_STEPS.indexOf(order.status);
  const isDelivery = order.order_type === 'delivery';
  const delivery = order.delivery || null;
  const dStepIndex = delivery ? deliveryStepIndex(delivery.status) : -1;
  const deliveryTerminal = delivery && ['cancelled', 'failed'].includes(delivery.status);
  const deliveryDone = delivery?.status === 'delivered';

  return (
    <div className="max-w-xl mx-auto px-5 py-16">
      <p className="section-label mb-2">{heading}</p>
      <h1 className="font-serif font-bold text-3xl text-cream mb-1">Order #{order.order_number}</h1>
      <p className="text-cream/55 mb-8">
        {order.location} &middot; {isDelivery ? 'Delivery' : 'Pickup'}
      </p>

      {/* Kitchen progress bar */}
      {order.status === 'cancelled' ? (
        <div className="badge bg-brick/20 text-brick inline-block mb-8">Cancelled</div>
      ) : (
        <div className="flex items-center gap-2 mb-10">
          {KITCHEN_STEPS.map((step, i) => (
            <div key={step} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= kitchenStepIndex ? 'bg-gold' : 'bg-cream/10'}`} />
              <p className={`text-[11px] mt-2 font-bold uppercase tracking-wide ${i <= kitchenStepIndex ? 'text-gold' : 'text-cream/35'}`}>
                {STATUS_LABEL[step]}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Delivery confirmed banner */}
      {deliveryDone && (
        <div className="rounded-2xl border border-gold/25 bg-gold/5 p-5 mb-5 text-center">
          <p className="text-gold font-bold text-lg">Your order was delivered!</p>
          {delivery.delivered_at && (
            <p className="text-cream/55 text-sm mt-1">
              at {new Date(delivery.delivered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      {/* Delivery cancelled / failed banner */}
      {deliveryTerminal && (
        <div className="rounded-2xl border border-brick/25 bg-brick/5 p-5 mb-5">
          <p className="text-brick font-semibold text-sm">
            Delivery {delivery.status === 'failed' ? 'failed' : 'was cancelled'}.
          </p>
          <p className="text-cream/55 text-sm mt-1">Please call us so we can sort this out for you.</p>
        </div>
      )}

      {/* Delivery progress card — shown while delivery is active */}
      {isDelivery && delivery && !deliveryTerminal && !deliveryDone && (
        <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-5 mb-5">
          <p className="section-label mb-4">Delivery progress</p>

          <div className="flex items-start gap-2 mb-5">
            {DELIVERY_STEPS.map((step, i) => (
              <div key={step.key} className="flex-1">
                <div className={`h-1.5 rounded-full ${i <= dStepIndex ? 'bg-gold' : 'bg-cream/10'}`} />
                <p className={`text-[10px] mt-2 font-bold uppercase tracking-wide leading-tight ${i <= dStepIndex ? 'text-gold' : 'text-cream/35'}`}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>

          {dStepIndex >= 1 && (
            <div className="space-y-2">
              {delivery.courier_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-cream/55">Courier</span>
                  <span className="text-cream/85">{delivery.courier_name}</span>
                </div>
              )}
              {delivery.courier_phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-cream/55">Call courier</span>
                  <a href={`tel:${delivery.courier_phone}`} className="text-gold">
                    {delivery.courier_phone}
                  </a>
                </div>
              )}
              {delivery.eta && (
                <div className="flex justify-between text-sm">
                  <span className="text-cream/55">ETA</span>
                  <span className="text-cream/85">
                    {new Date(delivery.eta).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              {delivery.tracking_url && (
                <a
                  href={delivery.tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary w-full justify-center !flex mt-3"
                >
                  Track on map &rarr;
                </a>
              )}
            </div>
          )}

          {dStepIndex < 1 && (
            <p className="text-cream/45 text-sm">
              Looking for an available courier. This usually takes just a minute or two.
            </p>
          )}
        </div>
      )}

      {deliveryDone && delivery?.tracking_url && (
        <div className="mb-5">
          <a href={delivery.tracking_url} target="_blank" rel="noreferrer" className="text-gold text-sm underline">
            View delivery summary &rarr;
          </a>
        </div>
      )}

      {/* Order items */}
      <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-5">
        {(order.items || []).map((item, i) => (
          <div key={i} className="flex justify-between text-sm py-1.5">
            <span className="text-cream/75">{item.quantity}&times; {item.item_name}</span>
            <span className="text-cream/55">{formatPrice(item.unit_price_cents * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-3 mt-2 border-t border-cream/10">
          <span className="text-cream font-semibold">Total</span>
          <span className="text-gold font-serif font-semibold text-lg">{formatPrice(order.order_total_cents)}</span>
        </div>
      </div>

      {order.estimated_ready_at && !isDelivery && (
        <p className="text-cream/55 text-sm mt-5 text-center">
          Estimated ready:{' '}
          {new Date(order.estimated_ready_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      )}

      {['new', 'in_progress'].includes(order.status) && (
        <NotificationOptIn orderId={orderId} />
      )}
    </div>
  );
}
