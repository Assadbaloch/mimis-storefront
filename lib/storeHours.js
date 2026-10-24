// Opening hours and "open now", always in the STORE's local time (Michigan).
//
// 2026-10-23: the contact page carried its own hardcoded hours and every card
// said "Open" around the clock. mimis.store_hours is the one source: the
// owner edits it in the dashboard, the phone agent quotes it, and
// mimis.store_open_now() enforces it. This file mirrors store_open_now()'s
// rules (weekday 0 = Sunday, a close earlier than the open means after
// midnight, yesterday's late shift counts). Pages are rendered on Vercel (UTC),
// so the store's clock is computed explicitly, never from the server's.

import { getSupabasePublicClient } from '@/lib/supabaseClient';

export const STORE_TZ = 'America/Detroit';
const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function getStoreHours() {
  const { data, error } = await getSupabasePublicClient()
    .from('store_hours')
    .select('location, weekday, opens_at, closes_at, closed');
  if (error || !data) return [];
  return data;
}

// Weekday (0 = Sunday) and "HH:MM" right now at the store.
export function storeNow(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map((x) => [x.type, x.value]));
  return { weekday: DAY_SHORT.indexOf(p.weekday), time: `${String(Number(p.hour) % 24).padStart(2, '0')}:${p.minute}` };
}

// "22:30:00" -> "10:30 PM"
export function fmt12(t) {
  const [h, m] = String(t || '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const hm = (t) => String(t || '').slice(0, 5);

function dayRows(rows, location) {
  const out = new Map();
  for (const r of rows || []) {
    if (r.location !== location) continue;
    const ok = !r.closed && r.opens_at && r.closes_at;
    out.set(Number(r.weekday), ok ? { o: hm(r.opens_at), c: hm(r.closes_at) } : null);
  }
  return out;
}

// [{ days: 'Sun–Thu', text: '11:30 AM – 10:30 PM' }, ...], Sunday first,
// equal neighbouring days grouped. Empty when the store has no hours saved.
export function hoursLines(rows, location) {
  const d = dayRows(rows, location);
  if (![...d.values()].some(Boolean)) return [];
  const label = (x) => (x ? `${fmt12(x.o)} – ${fmt12(x.c)}` : 'Closed');
  const lines = [];
  for (let i = 0; i < 7; i++) {
    const text = label(d.get(i));
    const last = lines[lines.length - 1];
    if (last && last.text === text) last.to = i;
    else lines.push({ from: i, to: i, text });
  }
  return lines.map((l) => ({
    days: l.from === l.to ? DAY_SHORT[l.from] : `${DAY_SHORT[l.from]}–${DAY_SHORT[l.to]}`,
    text: l.text,
  }));
}

// { open, hasHours, label } -- label e.g. "Open now · until 10:30 PM",
// "Closed · opens today 3:00 PM", "Closed · opens tomorrow 11:30 AM".
export function openStatus(rows, location, now = new Date()) {
  const d = dayRows(rows, location);
  const hasHours = [...d.values()].some(Boolean);
  if (!hasHours) return { open: null, hasHours, label: '' };
  const { weekday: wd, time: t } = storeNow(now);
  const today = d.get(wd);
  const prev = d.get((wd + 6) % 7);
  let closes = null;
  if (today && (today.c > today.o ? t >= today.o && t < today.c : t >= today.o)) closes = today.c;
  if (!closes && prev && prev.c <= prev.o && t < prev.c) closes = prev.c;
  if (closes) return { open: true, hasHours, label: `Open now · until ${fmt12(closes)}` };
  for (let i = 0; i <= 7; i++) {
    const r = d.get((wd + i) % 7);
    if (r && (i > 0 || t < r.o)) {
      const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY[(wd + i) % 7];
      return { open: false, hasHours, label: `Closed · opens ${when} ${fmt12(r.o)}` };
    }
  }
  return { open: false, hasHours, label: 'Closed' };
}

// -- Pre-orders (2026-10-24, claude/PREORDER_SPEC.md) -------------------------
// Customer wording only: "Order now", "Pre-order for later", "Ready in about
// 20 min", "Friday, Oct 24 at 3:30 PM". Never ASAP / slot / scheduled.

const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: STORE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

// "3:30 PM" in store time.
export function timeLabel(iso) {
  return new Intl.DateTimeFormat('en-US', { timeZone: STORE_TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

// "Today" / "Tomorrow" / "Sat, Oct 25" in store time.
export function dayLabel(iso, now = new Date()) {
  const d = new Date(iso);
  const diff = Math.round((Date.parse(dayKey(d)) - Date.parse(dayKey(now))) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-US', { timeZone: STORE_TZ, weekday: 'short', month: 'short', day: 'numeric' }).format(d);
}

// "Friday, Oct 24 at 3:30 PM" in store time.
export function whenLong(iso) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('en-US', { timeZone: STORE_TZ, weekday: 'long', month: 'short', day: 'numeric' }).format(d);
  return `${day} at ${timeLabel(iso)}`;
}

// "Fri, Oct 24 at 3:30 PM" (short, for buttons).
export function whenShort(iso) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('en-US', { timeZone: STORE_TZ, weekday: 'short', month: 'short', day: 'numeric' }).format(d);
  return `${day} at ${timeLabel(iso)}`;
}

// Times grouped by store day, in order: [{ key, label, times: [iso…] }].
export function groupByDay(isoList, now = new Date()) {
  const out = [];
  for (const iso of isoList) {
    const key = dayKey(new Date(iso));
    let g = out[out.length - 1];
    if (!g || g.key !== key) { g = { key, label: dayLabel(iso, now), times: [] }; out.push(g); }
    g.times.push(iso);
  }
  return out;
}

// "We open at 3:00 PM." / "We open tomorrow at 12:00 PM." / "We open Saturday at …"
export function opensSentence(status, now = new Date()) {
  if (!status || status.next_open_day == null || !status.next_opens_at) return '';
  const today = storeNow(now).weekday;
  const d = Number(status.next_open_day);
  const day = d === today ? '' : d === (today + 1) % 7 ? ' tomorrow' : ` ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]}`;
  return `We open${day} at ${fmt12(status.next_opens_at)}.`;
}

// Live store status for the website (mimis.preorder_now), shared by every
// component on the page and refreshed once a minute. null until loaded or if
// the call fails -- callers then show exactly what they showed before.
const statusCache = new Map(); // key -> { at, value, promise }
export async function fetchStoreStatus(location, orderType = 'pickup') {
  const key = `${location}|${orderType}`;
  const hit = statusCache.get(key);
  if (hit && Date.now() - hit.at < 60000) return hit.value ?? hit.promise;
  const promise = getSupabasePublicClient()
    .rpc('preorder_now', { p_location: location, p_order_type: orderType, p_channel: 'website' })
    .then(({ data, error }) => {
      const value = error || !data ? null : data;
      statusCache.set(key, { at: Date.now(), value });
      return value;
    })
    .catch(() => { statusCache.set(key, { at: Date.now(), value: null }); return null; });
  statusCache.set(key, { at: Date.now(), value: undefined, promise });
  return promise;
}

export async function fetchPreorderTimes(location, orderType) {
  const { data, error } = await getSupabasePublicClient()
    .rpc('preorder_slots', { p_location: location, p_order_type: orderType, p_channel: 'website' });
  if (error || !Array.isArray(data)) return null;
  return data.map((r) => r.slot_at ?? r).filter(Boolean);
}

// The website is closed for ordering right now and pre-orders are on.
export function closedForNow(status) {
  return !!status && status.preorders_enabled && (!status.open_now || status.paused);
}
