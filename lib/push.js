// Native Web Push helpers. The VAPID public key is meant to be public (it's
// embedded in every subscribed browser's PushSubscription) -- same safe-default
// pattern as the Supabase anon key in lib/supabaseClient.js. The matching
// private key lives only in an n8n credential and is never used client-side.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BG7zA_uEP7E78eFgYrmEa07CqrjurZ8rBDKXwzTy_H0EQJC7PlSb-tjAg-czEXufM0LARWbHnjCtnuPxv1qZ1YY';

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
