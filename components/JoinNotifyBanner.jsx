'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isPushSupported, getExistingSubscription, subscribeAndLink } from '@/lib/push';
import { MEMBER_PHONE_KEY, normalizePhone, formatPhoneInput } from '@/lib/loyalty';

const DISMISS_KEY = 'mimis-push-dismissed-general';

// Site-wide entry point for "join + get notified" -- the counterpart to
// NotificationOptIn.jsx (which only ever sees customers mid-order). This is
// for everyone else: someone browsing the menu who's never ordered, or who
// joined Rewards on a different device. Phone is the required identity
// anchor (matches /api/enroll's contract -- same n8n loyalty-enroll webhook
// the GHL form and /rewards page already use), name is the required
// secondary anchor (enforced in /api/enroll, not as a DB constraint --
// see route.js for why). Once enrolled, orders placed with that phone number
// reconcile to the same mimis.customers row the Loyalty Engine already
// awards points against -- this banner doesn't invent a second identity
// model, it's just another front door into the existing one.
//
// Returning members (phone already saved on this device via /rewards) skip
// straight to a one-tap "enable notifications" prompt instead of re-asking
// for their phone.
export default function JoinNotifyBanner() {
  const pathname = usePathname();
  const [state, setState] = useState('checking'); // checking | join | returning | joining | subscribed | denied | unsupported | dismissed | error
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [savedPhone, setSavedPhone] = useState('');

  useEffect(() => {
    if (!isPushSupported()) {
      setState('unsupported');
      return;
    }
    if (window.localStorage.getItem(DISMISS_KEY)) {
      setState('dismissed');
      return;
    }
    getExistingSubscription().then((sub) => {
      if (sub) {
        setState('dismissed');
        return;
      }
      const phone = window.localStorage.getItem(MEMBER_PHONE_KEY);
      if (phone) {
        setSavedPhone(phone);
        setState('returning');
      } else {
        setState('join');
      }
    }).catch(() => setState('join'));
  }, []);

  // Hide on admin/checkout/cart -- a permission-prompt banner has no business
  // interrupting a purchase or the owner's back office.
  const hidden = pathname?.startsWith('/admin') || pathname?.startsWith('/checkout') || pathname?.startsWith('/cart');
  if (hidden || ['checking', 'unsupported', 'dismissed'].includes(state)) return null;

  function handleDismiss() {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setState('dismissed');
  }

  async function enableForPhone(phone) {
    try {
      if (Notification.permission === 'denied') {
        setState('denied');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        return;
      }
      await subscribeAndLink({ customerPhone: phone, consentMarketing: true });
      window.localStorage.setItem(DISMISS_KEY, '1');
      setState('subscribed');
    } catch (err) {
      console.error('Push subscribe failed', err);
      setErrorMsg(err?.message || 'Something went wrong enabling notifications.');
      setState('error');
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    const phone = normalizePhone(phoneInput);
    if (phone.length !== 10) {
      setErrorMsg('Enter a valid 10-digit phone number.');
      return;
    }
    if (!nameInput.trim()) {
      setErrorMsg('Enter your name.');
      return;
    }
    setErrorMsg('');
    setState('joining');
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: nameInput, phone_number: phone }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Could not complete sign-up. Please try again.');
        setState('join');
        return;
      }
      window.localStorage.setItem(MEMBER_PHONE_KEY, phone);
      await enableForPhone(phone);
    } catch (err) {
      console.error('join failed', err);
      setErrorMsg('Could not reach the rewards system. Please try again shortly.');
      setState('join');
    }
  }

  const shellClass =
    'fixed inset-x-3 bottom-[4.75rem] md:inset-x-auto md:right-5 md:bottom-5 md:max-w-sm z-30 ' +
    'rounded-2xl border border-cream/10 bg-ink shadow-2xl shadow-black/40 p-5';

  if (state === 'subscribed') {
    return (
      <div className={shellClass}>
        <p className="text-gold text-sm font-semibold">You&rsquo;re in! We&rsquo;ll notify you about deals, new items, and order updates.</p>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className={shellClass}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-cream/60 text-xs">
            You&rsquo;re enrolled in Rewards, but notifications are blocked for this site in your browser settings.
          </p>
          <button onClick={handleDismiss} className="text-cream/30 hover:text-cream/60 text-xs shrink-0">✕</button>
        </div>
      </div>
    );
  }

  if (state === 'returning') {
    return (
      <div className={shellClass}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-cream/70 text-sm">Welcome back. Want deal &amp; order alerts on this device too?</p>
          <button onClick={handleDismiss} className="text-cream/30 hover:text-cream/60 text-xs shrink-0">✕</button>
        </div>
        {errorMsg && <p className="text-brick text-xs mb-2">{errorMsg}</p>}
        <button onClick={() => enableForPhone(savedPhone)} className="btn-primary w-full !py-2 text-sm">
          Enable Notifications
        </button>
      </div>
    );
  }

  // join | joining
  return (
    <div className={shellClass}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="section-label">Mimi&rsquo;s Rewards</p>
        <button onClick={handleDismiss} className="text-cream/30 hover:text-cream/60 text-xs shrink-0">✕</button>
      </div>
      <p className="text-cream text-sm font-semibold mb-1">Join free &amp; get notified</p>
      <p className="text-cream/55 text-xs mb-3">Earn points on every order, plus alerts on deals and order status. No password needed.</p>
      <form onSubmit={handleJoin} className="flex flex-col gap-2">
        <input
          type="tel"
          inputMode="numeric"
          placeholder="Phone number (required)"
          value={phoneInput}
          onChange={(e) => setPhoneInput(formatPhoneInput(e.target.value))}
          className="input !py-2 text-sm"
          required
        />
        <input
          type="text"
          placeholder="Full name (required)"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          className="input !py-2 text-sm"
          required
        />
        {errorMsg && <p className="text-brick text-xs">{errorMsg}</p>}
        <button type="submit" disabled={state === 'joining'} className="btn-primary w-full !py-2 text-sm disabled:opacity-60">
          {state === 'joining' ? 'Joining…' : 'Join & Notify Me'}
        </button>
      </form>
    </div>
  );
}
