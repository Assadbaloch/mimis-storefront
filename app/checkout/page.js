'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { REDEMPTION_CODE_KEY } from '@/lib/loyalty';
import MemberRewardsPanel from '@/components/MemberRewardsPanel';

export default function CheckoutPage() {
  const { items, totalCents, clear } = useCart();
  const [orderType, setOrderType] = useState('pickup');
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone_number: '', email: '', notes: '',
    address_line1: '', address_line2: '', city: '', state: '', postal_code: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rewardCode, setRewardCode] = useState(null);
  const [discountCents, setDiscountCents] = useState(0);
  const [redirectNotice, setRedirectNotice] = useState('');
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  // Client-side preview only -- the server (Online Order Intake workflow)
  // independently re-validates the redemption code against this same
  // phone number and is the actual source of truth for discount_cents,
  // shown on the checkoutResult screen below. This just keeps the
  // pre-submit total from looking wrong while a reward is selected.
  const dueCents = Math.max(totalCents - discountCents, 0);

  // MemberRewardsPanel owns localStorage persistence for the active code --
  // this just mirrors its current value so handleSubmit can send it, and so
  // the success/failure copy below can reference it. Selecting, swapping, or
  // removing a reward all flow through onCodeChange, applied automatically;
  // no code to copy/paste.
  function handleCodeChange(code) {
    setRewardCode(code);
  }

  // If the member identifies themselves to the rewards panel with a phone
  // number and the order form's own phone field is still empty, save them
  // re-typing it -- same person, same number, almost always.
  function handlePhoneIdentified(phone) {
    setForm((f) => (f.phone_number ? f : { ...f, phone_number: phone }));
  }

  // Order is already created server-side (pending_payment) and the cart is
  // already cleared by this point -- show the real math before sending them
  // to Clover instead of falling through to the empty-cart screen below.
  if (checkoutResult) {
    const { order_number, order_total_cents, discount_cents, total_due_cents } = checkoutResult;
    return (
      <div className="max-w-md mx-auto px-5 py-16">
        <h1 className="font-serif font-bold text-2xl text-cream mb-1">Order #{order_number}</h1>
        <p className="text-cream/55 mb-6 text-sm">Review your total, then continue to Clover&rsquo;s secure checkout to pay.</p>

        <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-5 mb-6">
          <div className="flex justify-between text-sm py-1">
            <span className="text-cream/75">Subtotal</span>
            <span className="text-cream/75">{formatPrice(order_total_cents)}</span>
          </div>
          {discount_cents > 0 && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-gold">Reward discount</span>
              <span className="text-gold">&minus;{formatPrice(discount_cents)}</span>
            </div>
          )}
          <div className="flex justify-between pt-3 mt-2 border-t border-cream/10">
            <span className="text-cream font-semibold">Total due</span>
            <span className="text-gold font-serif font-semibold text-lg">{formatPrice(total_due_cents)}</span>
          </div>
        </div>

        {redirectNotice && <p className="text-cream/55 text-sm mb-4">{redirectNotice}</p>}

        <button
          type="button"
          onClick={handleContinueToPayment}
          disabled={redirecting}
          className="btn-primary w-full justify-center !flex disabled:opacity-50"
        >
          {redirecting ? 'Redirecting…' : `Continue to Secure Payment — ${formatPrice(total_due_cents)}`}
        </button>
        <p className="text-cream/35 text-xs text-center mt-3">You&rsquo;ll be redirected to Clover&rsquo;s secure checkout to complete payment.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <h1 className="font-serif font-bold text-2xl text-cream mb-3">Nothing to check out</h1>
        <Link href="/menu" className="btn-primary">Browse the Menu</Link>
      </div>
    );
  }

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setRedirectNotice('');

    if (!form.phone_number.trim()) {
      setError('Phone number is required.');
      return;
    }

    if (orderType === 'delivery') {
      if (!form.address_line1.trim() || !form.city.trim() || !form.state.trim() || !form.postal_code.trim()) {
        setError('Please fill in your full delivery address.');
        return;
      }
    }

    const delivery_address = orderType === 'delivery' ? {
      address_line1: form.address_line1.trim(),
      ...(form.address_line2.trim() && { address_line2: form.address_line2.trim() }),
      city: form.city.trim(),
      state: form.state.trim(),
      postal_code: form.postal_code.trim(),
      phone: form.phone_number.trim(),
      contact_name: `${form.first_name} ${form.last_name}`.trim(),
    } : undefined;

    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          order_type: orderType,
          location: 'Madison Heights',
          redemption_code: rewardCode || undefined,
          delivery_address,
          items: items.map((i) => ({
            name: i.name,
            price_cents: i.price_cents,
            quantity: i.quantity,
            modifiers: i.modifiers || [],
            special_instructions: i.special_instructions || '',
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Something went wrong starting checkout.');
        setSubmitting(false);
        return;
      }

      window.localStorage.setItem('mimis-last-order', JSON.stringify({
        order_id: data.order_id,
        order_number: data.order_number,
        created_at: new Date().toISOString(),
      }));
      clear();

      const discount = data.discount_cents || 0;
      if (rewardCode && discount > 0) {
        // Valid for this phone number and applied server-side -- clear it so
        // it can't show up as "still pending" on the next order.
        window.localStorage.removeItem(REDEMPTION_CODE_KEY);
      } else if (rewardCode && discount === 0) {
        // Code didn't match this phone number (or is expired/already used)
        // -- left pending so they can retry after fixing the phone, but the
        // order still goes through at full price rather than blocking.
        setRedirectNotice('That reward didn’t apply (check the phone number matches your rewards account) — continuing at full price…');
      }

      // Show the real order math (subtotal, reward discount, total due) and
      // let the customer hit "Continue" themselves, rather than silently
      // redirecting to Clover on a timer -- that's what was hiding the
      // discount math entirely on fast connections / short timers.
      setCheckoutResult({
        checkout_url: data.checkout_url,
        order_number: data.order_number,
        order_total_cents: data.order_total_cents ?? totalCents,
        discount_cents: discount,
        total_due_cents: data.total_due_cents ?? (data.order_total_cents ?? totalCents) - discount,
      });
      setSubmitting(false);
    } catch (err) {
      setError('Could not reach the order system. Please try again.');
      setSubmitting(false);
    }
  }

  function handleContinueToPayment() {
    setRedirecting(true);
    window.location.href = checkoutResult.checkout_url;
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-16">
      <h1 className="font-serif font-bold text-3xl md:text-4xl text-cream mb-2">Checkout</h1>
      <p className="text-cream/55 mb-6">
        {orderType === 'delivery'
          ? 'Delivered from our Madison Heights location.'
          : 'Pickup from Madison Heights — 28931 John R Rd.'}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-8">
        <button
          type="button"
          onClick={() => setOrderType('pickup')}
          className={`rounded-xl border py-3 text-sm font-semibold transition ${orderType === 'pickup' ? 'border-gold bg-gold/10 text-gold' : 'border-cream/10 text-cream/55'}`}
        >
          Pickup
        </button>
        <button
          type="button"
          onClick={() => setOrderType('delivery')}
          className={`rounded-xl border py-3 text-sm font-semibold transition ${orderType === 'delivery' ? 'border-gold bg-gold/10 text-gold' : 'border-cream/10 text-cream/55'}`}
        >
          Delivery
        </button>
      </div>

      <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-5 mb-6">
        {items.map((i) => (
          <div key={i._key} className="flex justify-between text-sm py-1.5">
            <span className="text-cream/75">{i.quantity}&times; {i.name}</span>
            <span className="text-cream/55">{formatPrice(i.price_cents * i.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-3 mt-2 border-t border-cream/10">
          <span className="text-cream font-semibold">Subtotal</span>
          <span className={`font-serif font-semibold text-lg ${discountCents > 0 ? 'text-cream/60 line-through' : 'text-gold'}`}>
            {formatPrice(totalCents)}
          </span>
        </div>
        {discountCents > 0 && (
          <>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gold">Reward discount</span>
              <span className="text-gold">&minus;{formatPrice(discountCents)}</span>
            </div>
            <div className="flex justify-between pt-2 mt-1 border-t border-cream/10">
              <span className="text-cream font-semibold">Total due</span>
              <span className="text-gold font-serif font-semibold text-lg">{formatPrice(dueCents)}</span>
            </div>
          </>
        )}
      </div>

      <div className="mb-8">
        <MemberRewardsPanel
          onCodeChange={handleCodeChange}
          onPhoneIdentified={handlePhoneIdentified}
          onDiscountChange={setDiscountCents}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input required placeholder="First name" value={form.first_name} onChange={update('first_name')} className="input" />
          <input placeholder="Last name" value={form.last_name} onChange={update('last_name')} className="input" />
        </div>
        <input required type="tel" placeholder="Phone number*" value={form.phone_number} onChange={update('phone_number')} className="input w-full" />
        <input type="email" placeholder="Email (optional)" value={form.email} onChange={update('email')} className="input w-full" />

        {orderType === 'delivery' && (
          <div className="space-y-4">
            <input required placeholder="Street address*" value={form.address_line1} onChange={update('address_line1')} className="input w-full" />
            <input placeholder="Apt / suite (optional)" value={form.address_line2} onChange={update('address_line2')} className="input w-full" />
            <div className="grid grid-cols-3 gap-4">
              <input required placeholder="City*" value={form.city} onChange={update('city')} className="input col-span-1" />
              <input required placeholder="State*" value={form.state} onChange={update('state')} className="input col-span-1" />
              <input required placeholder="ZIP*" value={form.postal_code} onChange={update('postal_code')} className="input col-span-1" />
            </div>
          </div>
        )}

        <textarea placeholder="Order notes (optional)" value={form.notes} onChange={update('notes')} className="input w-full" rows={3} />
        {rewardCode && (
          <p className="text-cream/40 text-xs">
            Reward <span className="text-gold">{rewardCode}</span>{' '}
            {discountCents > 0
              ? `applies a ${formatPrice(discountCents)} discount if this phone number matches your rewards account.`
              : 'will apply if this phone number matches your rewards account.'}
          </p>
        )}

        {error && <p className="text-brick text-sm">{error}</p>}
        {redirectNotice && <p className="text-gold text-sm">{redirectNotice}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full justify-center !flex disabled:opacity-50">
          {submitting ? 'Starting checkout…' : `Pay ${formatPrice(dueCents)} with Clover`}
        </button>
        <p className="text-cream/35 text-xs text-center">You&rsquo;ll be redirected to Clover&rsquo;s secure checkout to complete payment.</p>
      </form>
    </div>
  );
}
