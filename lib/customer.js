import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { normalizePhone } from '@/lib/loyalty';

// Remembered checkout details.
//
// Retyping name, phone, email and a full delivery address on every order is
// the largest remaining friction on the path to payment, and it falls hardest
// on the repeat customers who matter most.
//
// Two sources, in priority order:
//
//   1. This device's own last checkout (localStorage). Works for everyone,
//      members or not, and needs no network round trip -- so the form is
//      already filled on first paint rather than filling in a beat later.
//
//   2. The customer's loyalty record, looked up by a phone number this device
//      has ALREADY established (from a previous order here, or the rewards
//      panel). Deliberately never looked up from a phone typed into the
//      checkout form: mimis.customers is readable by the anon role, so
//      auto-filling a name from an arbitrary typed number would turn checkout
//      into a way to test whether a phone number belongs to a real customer
//      and learn their name. The rewards panel already asks for a number
//      explicitly and is the right place for that.
//
// Nothing here is authoritative. The server re-validates every order, and
// these values only ever pre-fill fields the customer can still edit.

export const CONTACT_KEY = 'mimis-contact-v1';

const FIELDS = [
  'first_name', 'last_name', 'phone_number', 'email',
  'address_line1', 'address_line2', 'city', 'state', 'postal_code',
];

export function readContact() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONTACT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** Persists only the fields we know about, so a stray form key can't leak in. */
export function saveContact(form, orderType) {
  if (typeof window === 'undefined') return;
  try {
    const existing = readContact() || {};
    const next = { ...existing };
    for (const f of FIELDS) {
      const v = (form?.[f] ?? '').toString().trim();
      if (v) next[f] = v;
    }
    if (orderType) next.order_type = orderType;
    next.saved_at = new Date().toISOString();
    window.localStorage.setItem(CONTACT_KEY, JSON.stringify(next));
  } catch { /* storage full or blocked -- prefill is a convenience, never required */ }
}

export function clearContact() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(CONTACT_KEY); } catch { /* ignore */ }
}

/**
 * Rewards member by exact phone, through mimis.rewards_lookup (2026-09-20).
 * The customers/transactions tables are NOT readable with the public key --
 * this RPC returns display fields only (first name, points, tier, visits) and
 * the member's last 10 point events. Never email, last name or birthday.
 * Returns { member: { customer, transactions } | null, error }.
 */
export async function lookupMember(rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (phone.length !== 10) return { member: null, error: null };
  const { data, error } = await getSupabasePublicClient()
    .rpc('rewards_lookup', { p_phone: phone });
  if (error) return { member: null, error };
  if (!data || !data.found || !data.customer) return { member: null, error: null };
  return { member: { customer: data.customer, transactions: data.transactions || [] }, error: null };
}

/**
 * Loyalty record for a phone this device already knows. Returns null rather
 * than throwing: a failed lookup must never block someone from ordering.
 * First name only since 2026-09-20: returning email/last name for any typed
 * phone number leaked them to anyone. The customer's own details still
 * prefill from this device's saved contact (readContact).
 */
export async function fetchMemberContact(rawPhone) {
  try {
    const { member } = await lookupMember(rawPhone);
    if (!member) return null;
    return { first_name: member.customer.first_name || '', phone_number: member.customer.phone_number };
  } catch {
    return null;
  }
}

/** Fills only blanks -- anything already typed always wins. */
export function fillBlanks(form, source) {
  if (!source) return form;
  const next = { ...form };
  for (const f of FIELDS) {
    if (!next[f] && source[f]) next[f] = source[f];
  }
  return next;
}
