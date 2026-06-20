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
