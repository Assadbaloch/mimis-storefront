import { getSupabasePublicClient } from './supabaseClient';

// Native Web Push helpers. The VAPID public key is meant to be public (it's
// embedded in every subscribed browser's PushSubscription) -- same safe-default
// pattern as the Supabase anon key in lib/supabaseClient.js. The matching
// private key lives only in mimis.app_secrets (key='vapid_private_key'), a
// service-role-only RLS-locked table read server-side by the n8n Push
// Notification Sender workflow -- never used client-side. Regenerated
// 2026-06-20 (prior fallback key had no stored matching private key anywhere,
// so it could never have actually sent a push -- safe to rotate since there
// were 0 subscribers at the time).
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BKqd16RneH1mKNqjpfasqP45ootEgfSmoMgU9gwITeisCWZKASKEwux-rcCgsk9LDHe06Ho6c8Tx0NA4zLNIY4Y';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush() {
  if (!isPushSupported()) throw new Error('Push notifications are not supported on this device.');
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

export async function unsubscribeFromPush() {
  const sub = await getExistingSubscription();
  if (sub) await sub.unsubscribe();
}

// Single shared path for "subscribe this device + link it to an identity",
// used by every opt-in surface (order tracking, rewards page, the site-wide
// banner) so they all write through the same upsert_push_subscription RPC
// instead of three slightly-different copies of this logic.
//
// Identity precedence mirrors the RPC itself: orderId wins when present
// (transactional order-ready pushes stay tied to that specific order),
// otherwise customerPhone anchors the subscription to an existing
// mimis.customers row (created via /api/enroll or already on file) so
// tier/personalized campaigns (loyalty milestone, winback, etc.) -- which
// require a phone-linked customer -- can reach this device too.
export async function subscribeAndLink({ orderId = null, customerPhone = null, consentMarketing = false } = {}) {
  const subscription = await subscribeToPush();
  const supabase = getSupabasePublicClient();
  const keys = subscription.toJSON().keys;
  const { data, error } = await supabase.rpc('upsert_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: keys.p256dh,
    p_auth_key: keys.auth,
    p_order_id: orderId,
    p_user_agent: navigator.userAgent,
    p_consent_marketing: consentMarketing,
    p_customer_phone: customerPhone,
  });
  if (error) throw error;
  return data;
}
