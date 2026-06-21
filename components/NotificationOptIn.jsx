'use client';
import { useEffect, useState } from 'react';
import { isPushSupported, getExistingSubscription, subscribeAndLink } from '@/lib/push';

// Contextual opt-in shown on the order tracking view. Ties the subscription
// to this specific order_id (not phone) so an owner-configured
// notification_rule (trigger_type: order_status_change) can push "it's ready"
// the moment the kitchen marks it done -- no need to keep the tab open.
export default function NotificationOptIn({ orderId }) {
  const [state, setState] = useState('checking'); // checking | offer | subscribing | subscribed | denied | unsupported | dismissed | error
  const [errorMsg, setErrorMsg] = useState('');
  // Marketing push is a SEPARATE, off-by-default opt-in from the transactional
  // "your order is ready" subscribe above -- a customer can get order updates
  // without ever agreeing to receive deals/promos. Keep these two consents
  // distinct rather than bundling them into one checkbox/button.
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    if (!isPushSupported()) {
      setState('unsupported');
      return;
    }
    if (window.localStorage.getItem(`mimis-push-dismissed-${orderId}`)) {
      setState('dismissed');
      return;
    }
    getExistingSubscription().then(async (sub) => {
      if (sub) {
        // Already subscribed on this device from a past order -- relink the
        // DB row to *this* order so a ready-status push fires for it instead.
        await subscribeAndLink({ orderId });
        setState('subscribed');
      } else {
        setState('offer');
      }
    }).catch(() => setState('offer'));
  }, [orderId]);

  async function handleEnable() {
    setState('subscribing');
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
      // Only ever passes consentMarketing=true when the customer explicitly
      // checked the separate marketing checkbox below -- never bundled with
      // the transactional order-update subscribe itself.
      await subscribeAndLink({ orderId, consentMarketing: marketingConsent });
      setState('subscribed');
    } catch (err) {
      console.error('Push subscribe failed', err);
      setErrorMsg(err?.message || 'Something went wrong enabling notifications.');
      setState('error');
    }
  }

  function handleDismiss() {
    window.localStorage.setItem(`mimis-push-dismissed-${orderId}`, '1');
    setState('dismissed');
  }

  if (state === 'checking' || state === 'unsupported' || state === 'dismissed') return null;

  if (state === 'subscribed') {
    return (
      <p className="text-center text-gold text-sm mt-5">We&rsquo;ll notify you the moment it&rsquo;s ready.</p>
    );
  }

  if (state === 'denied') {
    return (
      <p className="text-center text-cream/40 text-xs mt-5">
        Notifications are blocked for this site in your browser settings.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-5">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-cream/10 bg-cream/[0.03] px-4 py-3">
        <p className="text-cream/70 text-sm">Get a notification the moment your order is ready.</p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleEnable}
            disabled={state === 'subscribing'}
            className="text-xs font-bold uppercase tracking-wide text-gold hover:text-gold/80 disabled:opacity-50"
          >
            {state === 'subscribing' ? 'Enabling…' : 'Notify Me'}
          </button>
          <button onClick={handleDismiss} className="text-cream/30 hover:text-cream/60 text-xs">
            Dismiss
          </button>
        </div>
      </div>
      {state === 'error' && (
        <p className="text-center text-red-400 text-xs px-1">{errorMsg} Tap Notify Me to try again.</p>
      )}
      <label className="flex items-start gap-2 px-1 text-cream/40 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          className="mt-0.5 accent-gold"
        />
        <span>
          Also send me deals, new menu items, and limited-time offers. Optional
          &mdash; you can turn this off anytime from your account.
        </span>
      </label>
    </div>
  );
}
