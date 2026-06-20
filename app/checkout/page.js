'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { REDEMPTION_CODE_KEY } from '@/lib/loyalty';
import MemberRewardsPanel from '@/components/MemberRewardsPanel';

export default function CheckoutPage() {
  const { items, totalCents, clear } = useCart();
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone_number: '', email: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rewardCode, setRewardCode] = useState(null);
  const [redirectNotice, setRedirectNotice] = useState('');

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

    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          order_type: 'pickup',
          location: 'Madison Heights',
          redemption_code: rewardCode || undefined,
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
        setRedirectNotice(`Reward applied — ${formatPrice(discount)} off! Redirecting to payment…`);
      } else if (rewardCode && discount === 0) {
        // Code didn't match this phone number (or is expired/already used)
        // -- left pending so they can retry after fixing the phone, but the
        // order still goes through at full price rather than blocking.
        setRedirectNotice('That reward didn’t apply (check the phone number matches your rewards account) — continuing at full price…');
      }

      const delay = rewardCode ? 1400 : 0;
      window.setTimeout(() => {
        window.location.href = data.checkout_url;
      }, delay);
    } catch (err) {
      setError('Could not reach the order system. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-16">
      <h1 className="font-serif font-bold text-3xl md:text-4xl text-cream mb-2">Checkout</h1>
      <p className="text-cream/55 mb-8">Pickup from Madison Heights &mdash; 28931 John R Rd.</p>

      <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-5 mb-6">
        {items.map((i) => (
          <div key={i._key} className="flex justify-between text-sm py-1.5">
            <span className="text-cream/75">{i.quantity}&times; {i.name}</span>
            <span className="text-cream/55">{formatPrice(i.price_cents * i.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-3 mt-2 border-t border-cream/10">
          <span className="text-cream font-semibold">Subtotal</span>
          <span className="text-gold font-serif font-semibold text-lg">{formatPrice(totalCents)}</span>
        </div>
      </div>

      <div className="mb-8">
        <MemberRewardsPanel onCodeChange={handleCodeChange} onPhoneIdentified={handlePhoneIdentified} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input required placeholder="First name" value={form.first_name} onChange={update('first_name')} className="input" />
          <input placeholder="Last name" value={form.last_name} onChange={update('last_name')} className="input" />
        </div>
        <input required type="tel" placeholder="Phone number*" value={form.phone_number} onChange={update('phone_number')} className="input w-full" />
        <input type="email" placeholder="Email (optional)" value={form.email} onChange={update('email')} className="input w-full" />
        <textarea placeholder="Order notes (optional)" value={form.notes} onChange={update('notes')} className="input w-full" rows={3} />
        {rewardCode && (
          <p className="text-cream/40 text-xs">
            Reward <span className="text-gold">{rewardCode}</span> will apply if this phone number matches your rewards account.
          </p>
        )}

        {error && <p className="text-brick text-sm">{error}</p>}
        {redirectNotice && <p className="text-gold text-sm">{redirectNotice}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full justify-center !flex disabled:opacity-50">
          {submitting ? 'Starting checkout…' : `Pay ${formatPrice(totalCents)} with Clover`}
        </button>
        <p className="text-cream/35 text-xs text-center">You&rsquo;ll be redirected to Clover&rsquo;s secure checkout to complete payment.</p>
      </form>
    </div>
  );
}
