'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { REDEMPTION_CODE_KEY, MEMBER_PHONE_KEY, formatPhoneInput } from '@/lib/loyalty';
import { readContact, saveContact, clearContact, fetchMemberContact, fillBlanks } from '@/lib/customer';
import MemberRewardsPanel from '@/components/MemberRewardsPanel';

// Session-scoped (not localStorage): this mirrors a live, ~15-minute Clover
// checkout session, not something that should survive past the browser tab
// closing the way mimis-last-order (order tracking) does. Guarded by
// REVIEW_TTL_MS below so a stale entry never masks a genuinely new order.
const REVIEW_STORAGE_KEY = 'mimis-checkout-review';
const REVIEW_TTL_MS = 15 * 60 * 1000;

function readStoredReview() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(REVIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > REVIEW_TTL_MS) {
      window.sessionStorage.removeItem(REVIEW_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function storeReview(result) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify({ ...result, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

function clearStoredReview() {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(REVIEW_STORAGE_KEY); } catch { /* ignore */ }
}

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
  // Initialized lazily from sessionStorage so a refresh (or the browser
  // restoring a backgrounded tab) lands back on the real order review
  // instead of the "Nothing to check out" screen -- the order already
  // exists server-side and the cart is already cleared by that point, so
  // losing this state previously meant losing the only place the customer
  // could see their total or get back to Clover.
  const [checkoutResult, setCheckoutResult] = useState(() => readStoredReview());
  const [redirecting, setRedirecting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Belt-and-suspenders: re-check on mount too, in case this component
  // instance was created before hydration had access to sessionStorage.
  useEffect(() => {
    if (!checkoutResult) {
      const stored = readStoredReview();
      if (stored) setCheckoutResult(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill from this device's last checkout, then top up any still-blank
  // fields from the loyalty record if this device already knows the customer's
  // phone. Both paths fill blanks only, so anything typed always wins -- the
  // async one can land after the customer has started typing.
  useEffect(() => {
    const saved = readContact();
    let known = null;

    if (saved) {
      setForm((f) => fillBlanks(f, saved));
      if (saved.order_type === 'delivery') setOrderType('delivery');
      known = saved.phone_number;
      setPrefilled(true);
    }
    if (!known && typeof window !== 'undefined') {
      try { known = window.localStorage.getItem(MEMBER_PHONE_KEY); } catch { /* ignore */ }
    }
    if (!known) return;

    let cancelled = false;
    fetchMemberContact(known).then((member) => {
      if (cancelled || !member) return;
      setForm((f) => {
        const next = fillBlanks(f, member);
        if (!next.phone_number && member.phone_number) {
          next.phone_number = formatPhoneInput(member.phone_number);
        }
        return next;
      });
      setPrefilled(true);
    });
    return () => { cancelled = true; };
  }, []);

  function forgetMe() {
    clearContact();
    setForm({
      first_name: '', last_name: '', phone_number: '', email: '', notes: '',
      address_line1: '', address_line2: '', city: '', state: '', postal_code: '',
    });
    setPrefilled(false);
  }

  // Submitting swaps a long form for a much shorter summary WITHOUT changing
  // route, so nothing else resets the scroll: the customer pressed a button at
  // the bottom of the form and stayed at that offset, which is now past the end
  // of the summary -- landing them in the footer with the order total somewhere
  // above them. Route-level scroll handling cannot see this because the URL
  // never changes; it has to be handled here, at the swap itself.
  useEffect(() => {
    if (!checkoutResult || typeof window === 'undefined') return;
    window.scrollTo(0, 0);
  }, [checkoutResult]);

  // A stored review always belongs to an order that was ALREADY placed, and
  // placing one empties the cart. So a non-empty cart means the customer has
  // started a new order since -- the saved review is stale and must not be
  // replayed. Without this, editing the cart and returning to checkout showed
  // the previous order's totals for up to 15 minutes, with no way to get past
  // it, because the review screen returns before the cart is ever examined.
  useEffect(() => {
    if (items.length > 0) {
      clearStoredReview();
      setCheckoutResult((current) => (current ? null : current));
    }
  }, [items.length]);
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
  // Guarded on an empty cart so a live cart always wins over a saved review;
  // the effect above clears the stored copy, this stops it rendering even for
  // the single frame before that runs.
  if (checkoutResult && items.length === 0) {
    const { order_number, order_total_cents, discount_cents, delivery_fee_cents, total_due_cents } = checkoutResult;
    return (
      <div className="max-w-md mx-auto px-5 py-16">
        <h1 className="font-serif font-bold text-2xl text-app mb-1">Order #{order_number}</h1>
        <p className="text-app-soft mb-6 text-sm">Review your total, then continue to Clover&rsquo;s secure checkout to pay.</p>

        <div className="rounded-app border border-line bg-surface p-5 mb-6">
          <div className="flex justify-between text-sm py-1">
            <span className="text-app-soft">Subtotal</span>
            <span className="text-app-soft">{formatPrice(order_total_cents)}</span>
          </div>
          {delivery_fee_cents > 0 && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-app-soft">Delivery fee</span>
              <span className="text-app-soft">{formatPrice(delivery_fee_cents)}</span>
            </div>
          )}
          {discount_cents > 0 && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-highlight">Reward discount</span>
              <span className="text-highlight">&minus;{formatPrice(discount_cents)}</span>
            </div>
          )}
          <div className="flex justify-between pt-3 mt-2 border-t border-line">
            <span className="text-app font-semibold">Total due</span>
            <span className="text-highlight font-serif font-semibold text-lg">{formatPrice(total_due_cents)}</span>
          </div>
        </div>

        {redirectNotice && <p className="text-app-soft text-sm mb-4">{redirectNotice}</p>}

        <button
          type="button"
          onClick={handleContinueToPayment}
          disabled={redirecting}
          className="btn-primary w-full justify-center !flex disabled:opacity-50"
        >
          {redirecting ? 'Redirecting…' : `Continue to Secure Payment — ${formatPrice(total_due_cents)}`}
        </button>
        <p className="text-app-faint text-xs text-center mt-3">You&rsquo;ll be redirected to Clover&rsquo;s secure checkout to complete payment.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <h1 className="font-serif font-bold text-2xl text-app mb-3">Nothing to check out</h1>
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

    // Same 10-digit validation the server (app/api/checkout and the Online
    // Order Intake workflow) enforces -- catching it here means a mistyped
    // or malformed number never even makes a network round trip, instead of
    // silently producing a $0 delivery fee later (what "89865342183" did).
    const phoneDigits = form.phone_number.replace(/\D/g, '');
    const validPhone = phoneDigits.length === 10 || (phoneDigits.length === 11 && phoneDigits[0] === '1');
    if (!phoneDigits) {
      setError('Phone number is required.');
      return;
    }
    if (!validPhone) {
      setError('Please enter a valid 10-digit phone number.');
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
      // Only remembered once an order actually went through -- details from an
      // abandoned attempt are not worth carrying forward.
      saveContact(form, orderType);
      clear();

      const discount = data.discount_cents || 0;
      if (rewardCode && discount > 0) {
        // Valid for this phone number and applied server-side -- clear it so
        // it can’t show up as "still pending" on the next order.
        window.localStorage.removeItem(REDEMPTION_CODE_KEY);
      } else if (rewardCode && discount === 0) {
        // Code didn’t match this phone number (or is expired/already used)
        // -- left pending so they can retry after fixing the phone, but the
        // order still goes through at full price rather than blocking.
        setRedirectNotice('That reward didn’t apply (check the phone number matches your rewards account) — continuing at full price…');
      }

      const deliveryFee = data.delivery_fee_cents || 0;
      const subtotal = data.order_total_cents ?? totalCents;

      // Show the real order math (subtotal, delivery fee, reward discount, total due) and
      // let the customer hit "Continue" themselves, rather than silently
      // redirecting to Clover on a timer -- that’s what was hiding the
      // discount math entirely on fast connections / short timers.
      const result = {
        checkout_url: data.checkout_url,
        order_number: data.order_number,
        order_total_cents: subtotal,
        discount_cents: discount,
        delivery_fee_cents: deliveryFee,
        total_due_cents: data.total_due_cents ?? (subtotal + deliveryFee - discount),
      };
      setCheckoutResult(result);
      storeReview(result);
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
      <h1 className="font-serif font-bold text-3xl md:text-4xl text-app mb-2">Checkout</h1>
      <p className="text-app-soft mb-6">
        {orderType === 'delivery'
          ? 'Delivered from our Madison Heights location.'
          : 'Pickup from Madison Heights — 28931 John R Rd.'}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-8">
        <button
          type="button"
          onClick={() => setOrderType('pickup')}
          className={`rounded-app-sm border py-3 text-sm font-semibold transition ${orderType === 'pickup' ? 'border-highlight bg-highlight-wash text-highlight' : 'border-line text-app-soft'}`}
        >
          Pickup
        </button>
        <button
          type="button"
          onClick={() => setOrderType('delivery')}
          className={`rounded-app-sm border py-3 text-sm font-semibold transition ${orderType === 'delivery' ? 'border-highlight bg-highlight-wash text-highlight' : 'border-line text-app-soft'}`}
        >
          Delivery
        </button>
      </div>

      <div className="rounded-app border border-line bg-surface p-5 mb-6">
        {items.map((i) => (
          <div key={i._key} className="flex justify-between text-sm py-1.5">
            <span className="text-app-soft">{i.quantity}&times; {i.name}</span>
            <span className="text-app-soft">{formatPrice(i.price_cents * i.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-3 mt-2 border-t border-line">
          <span className="text-app font-semibold">Subtotal</span>
          <span className={`font-serif font-semibold text-lg ${discountCents > 0 ? 'text-app-soft line-through' : 'text-highlight'}`}>
            {formatPrice(totalCents)}
          </span>
        </div>
        {orderType === 'delivery' && (
          <div className="flex justify-between text-sm py-1">
            <span className="text-app-faint">Delivery fee</span>
            <span className="text-app-faint">calculated at checkout</span>
          </div>
        )}
        {discountCents > 0 && (
          <>
            <div className="flex justify-between text-sm py-1">
              <span className="text-highlight">Reward discount</span>
              <span className="text-highlight">&minus;{formatPrice(discountCents)}</span>
            </div>
            <div className="flex justify-between pt-2 mt-1 border-t border-line">
              <span className="text-app font-semibold">Total due</span>
              <span className="text-highlight font-serif font-semibold text-lg">{formatPrice(dueCents)}</span>
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
        {prefilled && (
          <div className="flex items-center justify-between gap-3 rounded-app-sm border border-line bg-surface px-4 py-2.5">
            <p className="text-app-soft text-xs">Your details are filled in from last time.</p>
            <button type="button" onClick={forgetMe} className="text-app-faint hover:text-app-soft text-xs shrink-0 underline">
              Not you?
            </button>
          </div>
        )}
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
          <p className="text-app-faint text-xs">
            Reward <span className="text-highlight">{rewardCode}</span>{' '}
            {discountCents > 0
              ? `applies a ${formatPrice(discountCents)} discount if this phone number matches your rewards account.`
              : 'will apply if this phone number matches your rewards account.'}
          </p>
        )}

        {error && <p className="text-danger text-sm">{error}</p>}
        {redirectNotice && <p className="text-highlight text-sm">{redirectNotice}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full justify-center !flex disabled:opacity-50">
          {submitting
            ? 'Starting checkout…'
            : orderType === 'delivery'
              ? `Continue — ${formatPrice(dueCents)} + delivery`
              : `Pay ${formatPrice(dueCents)} with Clover`}
        </button>
        <p className="text-app-faint text-xs text-center">You&rsquo;ll be redirected to Clover&rsquo;s secure checkout to complete payment.</p>
      </form>
    </div>
  );
}
