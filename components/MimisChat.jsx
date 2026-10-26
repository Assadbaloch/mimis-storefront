'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useEngaged } from '@/lib/floatingSlot';
import { useLocation } from '@/lib/location';
import { useStoreStatus } from '@/lib/useStoreStatus';
import { getStoreLocations } from '@/lib/storeLocations';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { readContact } from '@/lib/customer';
import { formatPhoneInput, normalizePhone } from '@/lib/loyalty';
import { timeLabel, dayLabel, orderingState, opensSentence } from '@/lib/storeHours';
import SmsOptIn from '@/components/SmsOptIn';

// Mimi's own website chat (2026-10-25). Spec: project doc claude/CHATBOT_SPEC.md.
// Replaces the GoHighLevel LeadConnector widget.
//
// No AI: every answer is a fixed, button-driven flow over live data (store
// details and hours from store_locations / store_hours, open/closed and
// pre-order state from the same status the menu uses, order status from the
// same lookup_order_status the order-status page uses).
//
// LIGHT BY DESIGN: the chat informs and links. It never rebuilds a page that
// already exists -- ordering happens on the menu, points on the Rewards page,
// full tracking on the order-status page.
//
// Everything the customer does is logged to the owner dashboard's Chats tab
// through /api/chat -> chat-intake -> mimis.chat_intake(). A message, catering
// request or order problem becomes a "needs reply" chat there. Phone numbers
// are collected only in those forms, each with the two SMS consent boxes
// (unchecked, optional) required for A2P 10DLC.
//
// POSITION: same corner and size as the old GHL launcher (bottom-right, 20px),
// so --mimis-chat-reserve in globals.css (CartBar, JoinNotifyBanner,
// PromoBanner) still keeps everything else clear of it. On the original design
// the phone tab bar sits at the bottom, so the launcher lifts above it.

const DEVICE_KEY = 'mimis-chat-device';
const SESSION_KEY = 'mimis-chat-session';
const LAST_ORDER_KEY = 'mimis-last-order';
const HISTORY_KEY = 'mimis-order-history';

const STATUS_LABEL = {
  pending_payment: 'Waiting for payment',
  scheduled: 'Booked for later',
  new: 'Received by the kitchen',
  in_progress: 'Being prepared',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const DELIVERY_LABEL = {
  requested: 'Finding a driver',
  courier_assigned: 'Driver assigned',
  picked_up: 'On the way to you',
  delivered: 'Delivered',
  cancelled: 'Delivery cancelled',
};
const ISSUES = [
  ['missing_item', 'Something was missing'],
  ['wrong_item', 'Wrong item'],
  ['late', 'Order is late'],
  ['quality', 'Food quality'],
  ['refund', 'Question about a charge'],
  ['other', 'Something else'],
];

function safeGet(store, key) {
  try { return window[store].getItem(key); } catch { return null; }
}
function safeSet(store, key, value) {
  try { window[store].setItem(key, value); } catch { /* private mode: chat still works */ }
}
function deviceKey() {
  let k = safeGet('localStorage', DEVICE_KEY);
  if (!k) {
    k = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${String(Math.random()).slice(2)}`;
    safeSet('localStorage', DEVICE_KEY, k);
  }
  return k;
}
function telHref(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d ? `tel:+${d.length === 10 ? `1${d}` : d}` : null;
}
function phoneLabel(phone) {
  const d = String(phone || '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : phone || '';
}
function orderLine(o) {
  if (!o) return '';
  if (o.payment_status !== 'paid' && o.status === 'pending_payment') return STATUS_LABEL.pending_payment;
  if (o.order_type === 'delivery' && o.delivery?.status && DELIVERY_LABEL[o.delivery.status]) return DELIVERY_LABEL[o.delivery.status];
  if (o.status === 'ready') return o.order_type === 'delivery' ? 'Ready, waiting for the driver' : 'Ready for pickup';
  return STATUS_LABEL[o.status] || o.status;
}

export async function chatPost(action, payload) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    const err = new Error(data.error && !/^[a-z_]+$/.test(data.error) ? data.error : 'Could not send right now. Please call the store.');
    err.code = data.error;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------- UI bits
function Bubble({ children }) {
  return <div className="max-w-[88%] rounded-app-sm rounded-tl-none bg-app-wash px-3 py-2 text-[13px] leading-snug text-app">{children}</div>;
}
function Choice({ children, onClick, href, external }) {
  const cls = 'block w-full text-left rounded-app-sm border border-line bg-surface px-3 py-2 text-[13px] font-semibold text-app hover:border-accent transition-colors';
  if (href) {
    return external
      ? <a href={href} onClick={onClick} className={cls}>{children}</a>
      : <Link href={href} onClick={onClick} className={cls}>{children}</Link>;
  }
  return <button type="button" onClick={onClick} className={cls}>{children}</button>;
}
function Field(props) {
  return <input {...props} className={`input w-full !py-2 text-sm ${props.className || ''}`} />;
}

export default function MimisChat({ liftForTabBar = false }) {
  const engaged = useEngaged(20000);
  const [narrow, setNarrow] = useState(null);
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState('home');
  const [stack, setStack] = useState([]);
  const [stores, setStores] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null); // this device's own live order
  const [recentNumbers, setRecentNumbers] = useState([]);
  const sessionRef = useRef(null);
  const startingRef = useRef(null);
  const { location, setLocation } = useLocation();
  const status = useStoreStatus(open ? location : null);
  const [ctx, setCtx] = useState({}); // shared form state across screens
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => { setNarrow(window.matchMedia('(max-width: 767px)').matches); }, []);
  // Same rule the GHL widget had (owner, 2026-10-23): on a phone, nothing
  // floats over a page someone has only just opened.
  const visible = narrow === false || (narrow === true && engaged);

  const store = stores.find((s) => s.key === location) || stores[0] || null;

  // ------------------------------------------------------------ session
  const ensureSession = useCallback(async () => {
    if (sessionRef.current) return sessionRef.current;
    if (startingRef.current) return startingRef.current;
    const saved = safeGet('sessionStorage', SESSION_KEY);
    if (saved) { sessionRef.current = saved; return saved; }
    startingRef.current = chatPost('start', { device_key: deviceKey(), page: window.location.href, location })
      .then((d) => { sessionRef.current = d.session_id; safeSet('sessionStorage', SESSION_KEY, d.session_id); return d.session_id; })
      .catch((e) => { console.error('[chat] could not start', e.message); return null; })
      .finally(() => { startingRef.current = null; });
    return startingRef.current;
  }, [location]);

  // Analytics only: a lost tap must never get in the customer's way, but it
  // is still reported in the console rather than swallowed.
  const log = useCallback(async (type, payload = {}, topic) => {
    const sid = await ensureSession();
    if (!sid) return;
    try {
      await chatPost('event', { session_id: sid, type, payload, topic, location });
    } catch (e) {
      if (e.code === 'no_session' || e.code === 'session_expired') {
        sessionRef.current = null;
        try { window.sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
      }
      console.error('[chat] event not logged', e.message);
    }
  }, [ensureSession, location]);

  // ------------------------------------------------------------ data on open
  useEffect(() => {
    if (!open) return;
    ensureSession();
    if (!stores.length) getStoreLocations().then(setStores).catch(() => setStores([]));
    // This device's own orders (written by checkout). Nobody else's orders
    // can show here: only what was ordered in this browser.
    try {
      const hist = JSON.parse(safeGet('localStorage', HISTORY_KEY) || '[]');
      setRecentNumbers(hist.map((o) => o?.order_number).filter(Boolean).slice(0, 3));
    } catch { setRecentNumbers([]); }
    let last = null;
    try { last = JSON.parse(safeGet('localStorage', LAST_ORDER_KEY) || 'null'); } catch { last = null; }
    if (last?.order_id && Date.now() - Date.parse(last.created_at || 0) < 24 * 3600e3) {
      getSupabasePublicClient().rpc('lookup_order_status', { p_order_id: last.order_id })
        .then(({ data, error: e }) => {
          const o = !e && Array.isArray(data) ? data[0] : null;
          const live = o && o.payment_status === 'paid' && o.status !== 'cancelled'
            && !(o.status === 'completed' && Date.now() - Date.parse(o.created_at) > 3 * 3600e3);
          setActiveOrder(live ? { ...o, order_id: last.order_id } : null);
        });
    } else {
      setActiveOrder(null);
    }
    const c = readContact();
    setCtx((x) => ({
      name: x.name ?? [c?.first_name, c?.last_name].filter(Boolean).join(' '),
      phone: x.phone ?? (c?.phone_number ? formatPhoneInput(c.phone_number) : ''),
      ...x,
    }));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------ navigation
  function go(next, label, topic) {
    setError('');
    setStack((s) => [...s, screen]);
    setScreen(next);
    if (label) log('tap', { label, screen: next }, topic);
  }
  function back() {
    setError('');
    const copy = [...stack];
    const prev = copy.pop() || 'home';
    setStack(copy);
    setScreen(prev);
  }
  function home() { setError(''); setStack([]); setScreen('home'); setDone(null); }
  function toggle() {
    if (!open) log('tap', { label: 'Opened chat' });
    setOpen(!open);
  }

  // ------------------------------------------------------------ submit
  async function submit(kind) {
    setError('');
    const phone = normalizePhone(ctx.phone || '');
    if (!String(ctx.name || '').trim()) { setError('Please enter your name.'); return; }
    if (phone.length !== 10) { setError('Please enter a 10-digit phone number.'); return; }
    if (kind === 'order_issue' && !ctx.issue) { setError('Please choose what went wrong.'); return; }
    if (kind !== 'order_issue' && !String(ctx.message || '').trim()) { setError('Please type your message.'); return; }
    setBusy(true);
    try {
      let sid = await ensureSession();
      if (!sid) throw new Error('Could not send right now. Please call the store.');
      const payload = {
        session_id: sid, kind, name: ctx.name, phone, location,
        message: ctx.message || '', issue: kind === 'order_issue' ? ctx.issue : undefined,
        order_number: ctx.order_number || undefined,
        sms_transactional: ctx.smsTxn === true, sms_marketing: ctx.smsMkt === true,
        page: window.location.href,
        website: ctx.website || '', company: ctx.company || '',
      };
      let r;
      try {
        r = await chatPost('submit', payload);
      } catch (e) {
        if (e.code !== 'no_session' && e.code !== 'session_expired') throw e;
        // The tab outlived its chat (24h): start a new one and send again.
        sessionRef.current = null;
        try { window.sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
        sid = await ensureSession();
        if (!sid) throw new Error('Could not send right now. Please call the store.');
        r = await chatPost('submit', { ...payload, session_id: sid });
      }
      setDone({ kind, reference: r.reference, consentSaved: r.consent_saved !== false, smsAsked: ctx.smsTxn || ctx.smsMkt });
      setCtx((x) => ({ ...x, message: '', issue: null, smsTxn: false, smsMkt: false }));
      setStack([]);
      setScreen('done');
    } catch (e) {
      setError(e.message || 'Could not send right now. Please call the store.');
    } finally {
      setBusy(false);
    }
  }

  // ------------------------------------------------------------ track
  async function lookup() {
    setError('');
    const phone = normalizePhone(ctx.track_phone || '');
    const number = String(ctx.track_number || '').trim();
    if (!number) { setError('Please enter your order number.'); return; }
    if (phone.length !== 10) { setError('Please enter the 10-digit phone number used for the order.'); return; }
    setBusy(true);
    const { data, error: e } = await getSupabasePublicClient()
      .rpc('lookup_order_status', { p_order_number: number, p_phone: phone });
    setBusy(false);
    if (e) {
      setError('Order lookup is not working right now. Please call the store.');
      log('lookup_failed', { order_number: number, reason: 'error' }, 'track');
      return;
    }
    const o = Array.isArray(data) ? data[0] : null;
    if (!o) {
      setError('We couldn’t find that order. Check the number and the phone used when ordering.');
      log('lookup_failed', { order_number: number, reason: 'not_found' }, 'track');
      return;
    }
    setCtx((x) => ({ ...x, tracked: o, order_number: o.order_number }));
    log('lookup', { order_number: o.order_number, status: o.status }, 'track');
    go('track_result');
  }

  // ------------------------------------------------------------ screens
  const storeName = store ? store.name : location;
  // Same rule as the menu and checkout (lib/storeHours.js orderingState):
  // 'open' | 'preorder' (closed or paused, pre-orders on) | 'closed'.
  const ordering = orderingState(status);
  const preorderOn = !!status?.preorders_enabled;

  function orderCard(o, own) {
    return (
      <div className="rounded-app-sm border border-line bg-surface p-3 text-[13px] text-app space-y-1">
        <p className="font-semibold">Order {o.order_number}</p>
        <p>{orderLine(o)}</p>
        <p className="text-app-soft text-xs">
          {o.order_type === 'delivery' ? 'Delivery' : 'Pickup'} · {o.location}
          {o.estimated_ready_at && !['completed', 'cancelled'].includes(o.status) ? ` · ready about ${dayLabel(o.estimated_ready_at) === 'Today' ? '' : `${dayLabel(o.estimated_ready_at)} `}${timeLabel(o.estimated_ready_at)}` : ''}
        </p>
        {o.delivery?.tracking_url && o.delivery.status !== 'delivered' && (
          <a href={o.delivery.tracking_url} target="_blank" rel="noopener noreferrer" className="text-xs underline" onClick={() => log('link', { label: 'Driver tracking', order_number: o.order_number }, 'track')}>Follow the driver</a>
        )}
        <div>
          <Link
            href={own && o.order_id ? `/order-status?order=${o.order_id}` : '/order-status'}
            className="text-xs underline"
            onClick={() => log('link', { label: 'Full order status', order_number: o.order_number }, 'track')}
          >
            Full order status
          </Link>
        </div>
      </div>
    );
  }

  function contactFields(kind) {
    return (
      <div className="space-y-2">
        <Field placeholder="Your name" value={ctx.name || ''} onChange={(e) => setCtx({ ...ctx, name: e.target.value })} autoComplete="name" />
        <Field type="tel" inputMode="numeric" placeholder="Phone number" value={ctx.phone || ''} onChange={(e) => setCtx({ ...ctx, phone: formatPhoneInput(e.target.value) })} autoComplete="tel" />
        {/* Honeypot: hidden from people, filled by bots. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <input tabIndex={-1} autoComplete="off" name="website" value={ctx.website || ''} onChange={(e) => setCtx({ ...ctx, website: e.target.value })} />
          <input tabIndex={-1} autoComplete="off" name="company" value={ctx.company || ''} onChange={(e) => setCtx({ ...ctx, company: e.target.value })} />
        </div>
        <SmsOptIn
          txn={ctx.smsTxn} mkt={ctx.smsMkt}
          onTxn={(v) => setCtx({ ...ctx, smsTxn: v })} onMkt={(v) => setCtx({ ...ctx, smsMkt: v })}
          idPrefix={`chat-${kind}`}
        />
        {error && <p className="text-danger text-xs" role="alert">{error}</p>}
        <button type="button" disabled={busy} onClick={() => submit(kind)} className="btn-primary w-full !py-2 text-sm">
          {busy ? 'Sending…' : 'Send to the store'}
        </button>
      </div>
    );
  }

  function storeLine() {
    if (!store) return null;
    return (
      <p className="text-app-soft text-xs">
        {storeName}{store.openLabel ? ` · ${store.openLabel}` : ''}
        {stores.length > 1 && (
          <>
            {' · '}
            <button type="button" className="underline" onClick={() => go('pick_store', 'Change store')}>change</button>
          </>
        )}
      </p>
    );
  }

  let body = null;
  if (screen === 'home') {
    body = (
      <>
        <Bubble>Hi! How can we help? Pick an option below.</Bubble>
        {activeOrder && (
          <>
            <Bubble>Here&rsquo;s your order from this device:</Bubble>
            {orderCard(activeOrder, true)}
          </>
        )}
        {storeLine()}
        <div className="space-y-2">
          <Choice onClick={() => go('order', 'Order food', 'order')}>Order food</Choice>
          <Choice onClick={() => go('track', 'Track my order', 'track')}>Track my order</Choice>
          <Choice onClick={() => go('issue_pick', 'Help with an order', 'order_issue')}>Help with an order</Choice>
          <Choice onClick={() => go('hours', 'Hours & locations', 'hours')}>Hours &amp; locations</Choice>
          <Choice onClick={() => go('faq', 'Questions', 'faq')}>Halal, delivery &amp; payment</Choice>
          <Choice onClick={() => go('rewards', 'Rewards', 'rewards')}>Mimi&rsquo;s Rewards</Choice>
          <Choice onClick={() => { setCtx({ ...ctx, kind: 'catering' }); go('message', 'Catering / large order', 'catering'); }}>Catering or a large order</Choice>
          <Choice onClick={() => { setCtx({ ...ctx, kind: 'message' }); go('message', 'Message us', 'message'); }}>Message the store</Choice>
          <Choice onClick={() => go('call', 'Call the store', 'call')}>Call the store</Choice>
        </div>
      </>
    );
  } else if (screen === 'pick_store') {
    body = (
      <>
        <Bubble>Which Mimi&rsquo;s?</Bubble>
        <div className="space-y-2">
          {stores.map((s) => (
            <Choice key={s.key} onClick={() => { setLocation(s.key); log('tap', { label: `Store: ${s.key}` }); back(); }}>
              {s.name}<span className="block text-xs font-normal text-app-soft">{s.address}</span>
            </Choice>
          ))}
        </div>
      </>
    );
  } else if (screen === 'order') {
    body = (
      <>
        {ordering === 'preorder' ? (
          <Bubble>{storeName} isn&rsquo;t taking orders for right now, but you can pre-order for later. Pick your food, then choose a time at checkout.</Bubble>
        ) : ordering === 'closed' ? (
          <Bubble>{storeName} is closed right now. {opensSentence(status) || 'Please check our hours.'}</Bubble>
        ) : (
          <Bubble>Order online for pickup or delivery from {storeName}. You pay securely online when you check out.</Bubble>
        )}
        {storeLine()}
        <div className="space-y-2">
          <Choice href="/menu" onClick={() => { log('link', { label: 'Open menu' }, 'order'); setOpen(false); }}>
            {ordering === 'preorder' ? 'Pre-order from the menu' : ordering === 'closed' ? 'See the menu' : 'Open the menu'}
          </Choice>
          <Choice onClick={() => go('call', 'Call to order')}>Order by phone instead</Choice>
        </div>
      </>
    );
  } else if (screen === 'track') {
    body = (
      <>
        {activeOrder ? orderCard(activeOrder, true) : null}
        <Bubble>{activeOrder ? 'Looking for a different order?' : 'Enter your order number and the phone number you ordered with.'}</Bubble>
        {recentNumbers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recentNumbers.map((n) => (
              <button key={n} type="button" className="rounded-full border border-line px-3 py-1 text-xs text-app" onClick={() => setCtx({ ...ctx, track_number: n })}>{n}</button>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <Field placeholder="Order number, e.g. MM-12345" value={ctx.track_number || ''} onChange={(e) => setCtx({ ...ctx, track_number: e.target.value })} />
          <Field type="tel" inputMode="numeric" placeholder="Phone number" value={ctx.track_phone ?? ctx.phone ?? ''} onChange={(e) => setCtx({ ...ctx, track_phone: formatPhoneInput(e.target.value) })} />
          {error && <p className="text-danger text-xs" role="alert">{error}</p>}
          <button type="button" disabled={busy} onClick={lookup} className="btn-primary w-full !py-2 text-sm">{busy ? 'Checking…' : 'Check status'}</button>
        </div>
      </>
    );
  } else if (screen === 'track_result' && ctx.tracked) {
    body = (
      <>
        {orderCard(ctx.tracked, false)}
        <div className="space-y-2">
          <Choice onClick={() => go('issue_type', 'Problem with this order', 'order_issue')}>Report a problem with this order</Choice>
          <Choice onClick={() => go('call', 'Call about order')}>Call the store about it</Choice>
        </div>
      </>
    );
  } else if (screen === 'issue_pick') {
    body = (
      <>
        <Bubble>
          {activeOrder || recentNumbers.length
            ? 'Which order do you need help with?'
            : 'Which order do you need help with? Enter the order number from your receipt or confirmation.'}
        </Bubble>
        <div className="space-y-2">
          {activeOrder && (
            <Choice onClick={() => { setCtx({ ...ctx, order_number: activeOrder.order_number }); go('issue_type', `Issue order ${activeOrder.order_number}`); }}>
              Order {activeOrder.order_number}<span className="block text-xs font-normal text-app-soft">{orderLine(activeOrder)}</span>
            </Choice>
          )}
          {recentNumbers.filter((n) => n !== activeOrder?.order_number).map((n) => (
            <Choice key={n} onClick={() => { setCtx({ ...ctx, order_number: n }); go('issue_type', `Issue order ${n}`); }}>Order {n}</Choice>
          ))}
          <Field placeholder={activeOrder || recentNumbers.length ? 'Or type the order number' : 'Order number, e.g. MM-12345'} value={ctx.order_number || ''} onChange={(e) => setCtx({ ...ctx, order_number: e.target.value })} />
          <button type="button" className="btn-primary w-full !py-2 text-sm" onClick={() => go('issue_type', 'Issue order typed')}>Continue</button>
          <button type="button" className="text-app-faint hover:text-app-soft text-xs w-full" onClick={() => { setCtx({ ...ctx, order_number: '' }); go('issue_type', 'Issue no order number'); }}>I don&rsquo;t have the order number</button>
        </div>
      </>
    );
  } else if (screen === 'issue_type') {
    body = (
      <>
        <Bubble>What went wrong{ctx.order_number ? ` with order ${ctx.order_number}` : ''}?</Bubble>
        <div className="grid grid-cols-2 gap-2">
          {ISSUES.map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setCtx({ ...ctx, issue: k })}
              className={`rounded-app-sm border px-2 py-2 text-xs font-semibold text-left ${ctx.issue === k ? 'border-accent bg-app-wash text-app' : 'border-line bg-surface text-app'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          placeholder="Tell us a little more (optional)"
          value={ctx.message || ''}
          onChange={(e) => setCtx({ ...ctx, message: e.target.value.slice(0, 1000) })}
          className="input w-full !py-2 text-sm"
        />
        <Bubble>How can the store reach you?</Bubble>
        {contactFields('order_issue')}
      </>
    );
  } else if (screen === 'message') {
    const catering = ctx.kind === 'catering';
    body = (
      <>
        <Bubble>
          {catering
            ? 'Tell us the date, time, number of people and what you have in mind. The store will get back to you.'
            : 'Type your message and the store will get back to you.'}
        </Bubble>
        {storeLine()}
        <textarea
          rows={4}
          placeholder={catering ? 'e.g. Saturday 6pm, 40 people, pizzas and wings' : 'Your message'}
          value={ctx.message || ''}
          onChange={(e) => setCtx({ ...ctx, message: e.target.value.slice(0, 1000) })}
          className="input w-full !py-2 text-sm"
        />
        {contactFields(catering ? 'catering' : 'message')}
      </>
    );
  } else if (screen === 'hours') {
    body = (
      <>
        {stores.length === 0 && <Bubble>Loading store details…</Bubble>}
        {stores.map((s) => (
          <div key={s.key} className="rounded-app-sm border border-line bg-surface p-3 text-[13px] text-app space-y-1">
            <p className="font-semibold">{s.name}</p>
            <p className="text-xs text-app-soft">{s.openLabel || s.status}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Mimi's Pizza & Burgers ${s.address}`)}`}
              target="_blank" rel="noopener noreferrer" className="block text-xs underline"
              onClick={() => log('link', { label: `Directions ${s.key}` }, 'hours')}
            >
              {s.address}
            </a>
            {s.phone && <a href={telHref(s.phone)} className="block text-xs underline" onClick={() => log('call', { location: s.key, from: 'hours' }, 'hours')}>{phoneLabel(s.phone)}</a>}
            {Array.isArray(s.hours) && s.hours.length > 0 && (
              <ul className="pt-1 text-xs text-app-soft">
                {s.hours.map((h) => <li key={h.days}>{h.days}: {h.text}</li>)}
              </ul>
            )}
          </div>
        ))}
      </>
    );
  } else if (screen === 'faq') {
    body = (
      <>
        <Bubble><strong>Is the food halal?</strong><br />Yes. Mimi&rsquo;s is 100% Zabiha Halal.</Bubble>
        <Bubble><strong>Do you deliver?</strong><br />Yes. Order on the website and choose Delivery at checkout. You&rsquo;ll see the delivery fee before you pay.</Bubble>
        <Bubble><strong>How do I pay?</strong><br />Website orders are paid online by card when you check out.</Bubble>
        <Bubble><strong>Can I order for later?</strong><br />{preorderOn ? 'Yes. Choose a time at checkout.' : 'When pre-orders are open, you can choose a time at checkout.'}</Bubble>
        <div className="space-y-2">
          <Choice href="/faq" onClick={() => { log('link', { label: 'FAQ page' }, 'faq'); setOpen(false); }}>More questions and answers</Choice>
          <Choice onClick={() => { setCtx({ ...ctx, kind: 'message' }); go('message', 'Ask a question'); }}>Ask the store</Choice>
        </div>
      </>
    );
  } else if (screen === 'rewards') {
    body = (
      <>
        <Bubble>Mimi&rsquo;s Rewards is free. You earn points on every order and turn them into rewards. Join or check your points on the Rewards page.</Bubble>
        <div className="space-y-2">
          <Choice href="/rewards" onClick={() => { log('link', { label: 'Rewards page' }, 'rewards'); setOpen(false); }}>Go to the Rewards page</Choice>
        </div>
      </>
    );
  } else if (screen === 'call') {
    const num = ctx.order_number || activeOrder?.order_number;
    body = (
      <>
        <Bubble>{num ? `Tap to call. Have your order number ready: ${num}.` : 'Tap to call the store.'}</Bubble>
        <div className="space-y-2">
          {stores.filter((s) => s.phone).map((s) => (
            <Choice key={s.key} href={telHref(s.phone)} external onClick={() => log('call', { location: s.key, order_number: num || null }, 'call')}>
              Call {s.name}<span className="block text-xs font-normal text-app-soft">{phoneLabel(s.phone)}</span>
            </Choice>
          ))}
          {stores.length === 0 && <Bubble>Loading store numbers…</Bubble>}
        </div>
      </>
    );
  } else if (screen === 'done' && done) {
    body = (
      <>
        <Bubble>
          Thanks! Your {done.kind === 'order_issue' ? 'report' : done.kind === 'catering' ? 'catering request' : 'message'} was sent to the store (reference {done.reference}). The store will get back to you.
        </Bubble>
        {done.smsAsked && !done.consentSaved && (
          <p className="text-danger text-xs" role="alert">Your message was sent, but your text-message choice could not be saved. You can tick the box again next time.</p>
        )}
        <div className="space-y-2">
          <Choice onClick={() => go('call', 'Call after message')}>Call the store now</Choice>
          <Choice onClick={home}>Back to start</Choice>
        </div>
      </>
    );
  } else {
    body = <Bubble>Something went wrong. <button type="button" className="underline" onClick={home}>Start again</button></Bubble>;
  }

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close chat' : 'Chat with Mimi’s'}
        aria-expanded={open}
        className={`fixed right-5 z-[100] h-14 w-14 rounded-full bg-accent text-on-accent shadow-lg flex items-center justify-center hover:opacity-90 transition
          ${liftForTabBar ? 'bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-5' : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom))]'}`}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" /></svg>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Mimi’s chat"
          className={`fixed z-[101] flex flex-col overflow-hidden border border-line bg-surface shadow-2xl
            inset-x-0 bottom-0 top-[10vh] rounded-t-app-lg
            md:inset-auto md:right-5 md:w-[360px] md:h-[min(620px,calc(100vh-7rem))] md:rounded-app-lg
            md:bottom-24`}
          style={{ background: 'var(--mimis-bg, var(--mimis-surface))' }}
        >
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            {screen !== 'home' && (
              <button type="button" onClick={screen === 'done' ? home : back} aria-label="Back" className="text-app-soft hover:text-app">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-serif font-bold text-app text-base leading-tight">Mimi&rsquo;s Pizza &amp; Burgers</p>
              <p className="text-app-faint text-[11px]">We usually reply during store hours</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="text-app-soft hover:text-app">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="relative flex-1 overflow-y-auto px-4 py-4 space-y-3">{body}</div>
          <div className="border-t border-line px-4 py-2 text-[10px] text-app-faint">
            <Link href="/privacy" className="underline" onClick={() => setOpen(false)}>Privacy</Link>
            {' · '}
            <Link href="/terms" className="underline" onClick={() => setOpen(false)}>Terms</Link>
            {store?.phone && (
              <>
                {' · '}
                <a href={telHref(store.phone)} className="underline" onClick={() => log('call', { location: store.key, from: 'footer' }, 'call')}>{phoneLabel(store.phone)}</a>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
