'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/format';
import { formatPhoneInput } from '@/lib/loyalty';
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

const LAST_ORDER_KEY = 'mimis-last-order';
// A checkout that was started but never paid for is not an order the customer
// should be shown days later -- the row is written before the Clover redirect,
// so an abandoned cart otherwise sits on this page forever. Anything older than
// this is dropped from the device regardless of state.
const LAST_ORDER_TTL_MS = 24 * 60 * 60 * 1000;

// Is this something the customer still has a live interest in? Used only for
// the silent, same-device restore. Explicit lookups (URL link, or an order
// number the customer typed in themselves) always display what they asked for.
function isActiveOrder(o) {
  if (!o) return false;
  if (o.payment_status !== 'paid') return false;
  if (o.status === 'cancelled') return false;
  // A finished order stays visible briefly so "Completed" is the last thing
  // they see after collecting, rather than the screen emptying on them.
  if (o.status === 'completed') {
    return Date.now() - new Date(o.created_at).getTime() < 3 * 60 * 60 * 1000;
  }
  return true;
}

export default function OrderStatusView({ heading, requireActive = false }) {
  const [order, setOrder] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lookupNumber, setLookupNumber] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const cancelledRef = useRef(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    cancelledRef.current = false;

    // ?order_id= used by SMS/email links.
    // ?order= is what Clover sends in the post-payment redirect URL.
    // Fall back to localStorage for same-device post-checkout flow.
    const urlOrderId = searchParams.get('order_id') || searchParams.get('order');
    let oid = urlOrderId || null;
    // Following a link (or landing here straight from checkout) is an explicit
    // request for THAT order, so it renders whatever its state -- including
    // "Awaiting Payment", which is exactly what someone who abandoned Clover
    // needs to see. Only the silent restore below is filtered.
    let mustBeActive = false;

    if (!oid) {
      let stored;
      try {
        stored = JSON.parse(window.localStorage.getItem(LAST_ORDER_KEY) || 'null');
      } catch {
        stored = null;
      }
      const savedAt = stored?.created_at ? new Date(stored.created_at).getTime() : 0;
      if (stored?.order_id && savedAt && Date.now() - savedAt > LAST_ORDER_TTL_MS) {
        try { window.localStorage.removeItem(LAST_ORDER_KEY); } catch { /* ignore */ }
        stored = null;
      }
      oid = stored?.order_id || null;
      mustBeActive = requireActive;
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
        window.localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({
          order_id: urlOrderId,
          created_at: new Date().toISOString(),
        }));
      } catch { /* ignore */ }
    }

    setOrderId(oid);

    const supabase = getSupabasePublicClient();

    async function fetchStatus() {
      const { data, error } = await supabase.rpc('lookup_order_status', { p_order_id: oid });
      if (cancelledRef.current) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) {
        setNotFound(true);
      } else if (mustBeActive && !isActiveOrder(row)) {
        // Never paid for, cancelled, or long finished -- stop resurfacing it.
        try { window.localStorage.removeItem(LAST_ORDER_KEY); } catch { /* ignore */ }
        setOrder(null);
        setNotFound(true);
      } else {
        setOrder(row);
        setNotFound(false);
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
  }, [searchParams, requireActive]);

  // Manual lookup. Requires the phone used on the order as well as the order
  // number: order numbers run in sequence, so number-only lookup would let
  // anyone read every customer's order by counting upwards.
  async function handleLookup(e) {
    e.preventDefault();
    const number = lookupNumber.trim();
    const digits = lookupPhone.replace(/\D/g, '');
    if (!number) { setLookupError('Enter the order number from your confirmation.'); return; }
    if (digits.length < 10) { setLookupError('Enter the 10-digit phone number used on the order.'); return; }

    setLookingUp(true);
    setLookupError('');
    try {
      const { data, error } = await getSupabasePublicClient().rpc('lookup_order_status', {
        p_order_number: number,
        p_phone: digits,
      });
      const row = Array.isArray(data) ? data[0] : data;
      if (error) {
        setLookupError('Could not reach the order system. Please try again.');
      } else if (!row) {
        setLookupError('No order matches that number and phone. Both must match your confirmation — the phone is the one you entered when ordering.');
      } else {
        setOrder(row);
        setOrderId(null);
        setNotFound(false);
      }
    } catch {
      setLookupError('Could not reach the order system. Please try again.');
    } finally {
      setLookingUp(false);
    }
  }

  if (loading) {
    return <p className="text-center text-app-soft py-24">Loading your order&hellip;</p>;
  }

  if (notFound || !order) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 md:py-20">
        <p className="section-label mb-2">{heading}</p>
        <h1 className="font-serif font-bold text-3xl text-app mb-3">No active order</h1>
        <p className="text-app-soft mb-7">
          You don&rsquo;t have an order in progress right now. If you&rsquo;ve just placed one,
          enter the order number from your confirmation along with the phone number you used.
        </p>

        <form onSubmit={handleLookup} className="rounded-app border border-line bg-surface p-5 space-y-3">
          <label className="block">
            <span className="text-app-soft text-xs uppercase tracking-wide font-bold">Order number</span>
            <input
              value={lookupNumber}
              onChange={(e) => setLookupNumber(e.target.value)}
              placeholder="e.g. MM-23508"
              autoComplete="off"
              className="input w-full mt-1.5"
            />
          </label>
          <label className="block">
            <span className="text-app-soft text-xs uppercase tracking-wide font-bold">Phone used on the order</span>
            <input
              type="tel"
              inputMode="numeric"
              value={lookupPhone}
              onChange={(e) => setLookupPhone(formatPhoneInput(e.target.value))}
              placeholder="(555) 123-4567"
              autoComplete="tel"
              className="input w-full mt-1.5"
            />
          </label>
          {lookupError && <p className="text-danger text-sm">{lookupError}</p>}
          <button type="submit" disabled={lookingUp} className="btn-primary w-full justify-center !flex disabled:opacity-50">
            {lookingUp ? 'Looking up…' : 'Track My Order'}
          </button>
        </form>

        <p className="text-app-faint text-xs mt-4">
          Orders placed on this device show up here automatically once payment goes through.
        </p>

        <div className="mt-8 text-center">
          <Link href="/menu" className="btn-secondary">Browse the Menu</Link>
        </div>
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
      <h1 className="font-serif font-bold text-3xl text-app mb-1">Order #{order.order_number}</h1>
      <p className="text-app-soft mb-8">
        {order.location} &middot; {isDelivery ? 'Delivery' : 'Pickup'}
      </p>

      {/* Kitchen progress bar */}
      {order.status === 'cancelled' ? (
        <div className="badge bg-danger-wash text-danger inline-block mb-8">Cancelled</div>
      ) : (
        <div className="flex items-center gap-2 mb-10">
          {KITCHEN_STEPS.map((step, i) => (
            <div key={step} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= kitchenStepIndex ? 'bg-highlight' : 'bg-app-wash'}`} />
              <p className={`text-[11px] mt-2 font-bold uppercase tracking-wide ${i <= kitchenStepIndex ? 'text-highlight' : 'text-app-faint'}`}>
                {STATUS_LABEL[step]}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Delivery confirmed banner */}
      {deliveryDone && (
        <div className="rounded-app border border-highlight-line bg-highlight-wash p-5 mb-5 text-center">
          <p className="text-highlight font-bold text-lg">Your order was delivered!</p>
          {delivery.delivered_at && (
            <p className="text-app-soft text-sm mt-1">
              at {new Date(delivery.delivered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      {/* Delivery cancelled / failed banner */}
      {deliveryTerminal && (
        <div className="rounded-app border border-danger-wash bg-danger-wash p-5 mb-5">
          <p className="text-danger font-semibold text-sm">
            Delivery {delivery.status === 'failed' ? 'failed' : 'was cancelled'}.
          </p>
          <p className="text-app-soft text-sm mt-1">Please call us so we can sort this out for you.</p>
        </div>
      )}

      {/* Delivery progress card — shown while delivery is active */}
      {isDelivery && delivery && !deliveryTerminal && !deliveryDone && (
        <div className="rounded-app border border-line bg-surface p-5 mb-5">
          <p className="section-label mb-4">Delivery progress</p>

          <div className="flex items-start gap-2 mb-5">
            {DELIVERY_STEPS.map((step, i) => (
              <div key={step.key} className="flex-1">
                <div className={`h-1.5 rounded-full ${i <= dStepIndex ? 'bg-highlight' : 'bg-app-wash'}`} />
                <p className={`text-[10px] mt-2 font-bold uppercase tracking-wide leading-tight ${i <= dStepIndex ? 'text-highlight' : 'text-app-faint'}`}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>

          {/* Courier name + phone — only once assigned */}
          {dStepIndex >= 1 && (
            <div className="space-y-2 mb-3">
              {delivery.courier_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-app-soft">Courier</span>
                  <span className="text-app">{delivery.courier_name}</span>
                </div>
              )}
              {delivery.courier_phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-app-soft">Call courier</span>
                  <a href={`tel:${delivery.courier_phone}`} className="text-highlight">
                    {delivery.courier_phone}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ETA + tracking link shown as soon as delivery is created */}
          <div className="space-y-2">
            {delivery.eta && (
              <div className="flex justify-between text-sm">
                <span className="text-app-soft">ETA</span>
                <span className="text-app">
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

          {dStepIndex < 1 && (
            <p className="text-app-faint text-sm mt-2">
              Looking for an available courier. This usually takes just a minute or two.
            </p>
          )}
        </div>
      )}

      {deliveryDone && delivery?.tracking_url && (
        <div className="mb-5">
          <a href={delivery.tracking_url} target="_blank" rel="noreferrer" className="text-highlight text-sm underline">
            View delivery summary &rarr;
          </a>
        </div>
      )}

      {/* Order items */}
      <div className="rounded-app border border-line bg-surface p-5">
        {(order.items || []).map((item, i) => (
          <div key={i} className="flex justify-between text-sm py-1.5">
            <span className="text-app-soft">{item.quantity}&times; {item.item_name}</span>
            <span className="text-app-soft">{formatPrice(item.unit_price_cents * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-3 mt-2 border-t border-line">
          <span className="text-app font-semibold">Total</span>
          <span className="text-highlight font-serif font-semibold text-lg">{formatPrice(order.order_total_cents)}</span>
        </div>
      </div>

      {order.estimated_ready_at && !isDelivery && (
        <p className="text-app-soft text-sm mt-5 text-center">
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
