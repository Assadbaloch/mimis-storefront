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
