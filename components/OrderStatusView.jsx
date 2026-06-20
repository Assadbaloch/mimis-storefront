'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/format';

const STATUS_LABEL = {
  pending_payment: 'Awaiting Payment',
  new: 'Received',
  in_progress: 'Being Prepared',
  ready: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_STEPS = ['new', 'in_progress', 'ready', 'completed'];

export default function OrderStatusView({ heading }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let stored;
    try {
      stored = JSON.parse(window.localStorage.getItem('mimis-last-order') || 'null');
    } catch {
      stored = null;
    }
    if (!stored?.order_id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    const supabase = getSupabasePublicClient();
    let cancelled = false;

    async function fetchStatus() {
      const { data, error } = await supabase.rpc('get_order_status', { p_order_id: stored.order_id });
      if (cancelled) return;
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setNotFound(true);
      } else {
        setOrder(Array.isArray(data) ? data[0] : data);
      }
      setLoading(false);
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) {
    return <p className="text-center text-cream/50 py-24">Loading your order…</p>;
  }

  if (notFound || !order) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <h1 className="font-serif font-bold text-2xl text-cream mb-3">No recent order found</h1>
        <p className="text-cream/55 mb-8">We can only show the order placed from this device. Place an order to track it here.</p>
        <Link href="/menu" className="btn-primary">Browse the Menu</Link>
      </div>
    );
  }

  const stepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="max-w-xl mx-auto px-5 py-16">
      <p className="section-label mb-2">{heading}</p>
      <h1 className="font-serif font-bold text-3xl text-cream mb-1">Order #{order.order_number}</h1>
      <p className="text-cream/55 mb-8">{order.location} &middot; {order.order_type === 'delivery' ? 'Delivery' : 'Pickup'}</p>

      {order.status === 'cancelled' ? (
        <div className="badge bg-brick/20 text-brick inline-block mb-8">Cancelled</div>
      ) : (
        <div className="flex items-center gap-2 mb-10">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= stepIndex ? 'bg-gold' : 'bg-cream/10'}`} />
              <p className={`text-[11px] mt-2 font-bold uppercase tracking-wide ${i <= stepIndex ? 'text-gold' : 'text-cream/35'}`}>
                {STATUS_LABEL[step]}
              </p>
            </div>
          ))}
        </div>
      )}

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

      {order.estimated_ready_at && (
        <p className="text-cream/55 text-sm mt-5 text-center">
          Estimated ready: {new Date(order.estimated_ready_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
}
