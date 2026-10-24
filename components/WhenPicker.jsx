'use client';
import { useEffect, useMemo, useState } from 'react';
import { fetchPreorderTimes, groupByDay, timeLabel, opensSentence } from '@/lib/storeHours';

// "Order now" / "Pre-order for later" at checkout (claude/PREORDER_SPEC.md §5).
//
// Renders NOTHING unless the owner has switched website pre-orders on for this
// store (status.preorders_enabled), so with pre-orders off checkout looks and
// behaves exactly as before.
//
// value: { mode: 'now' | 'later', at: iso | null }
// Store open   -> two choices, "Order now" selected ("Ready in about 20 min").
// Store closed -> "We're closed right now. We open at 3:00 PM." and only
//                 "Pre-order for later", first time already chosen.
// Paused       -> "We're not taking orders for a short while." (nothing to pick).
// Times come from mimis.preorder_slots; the server checks the chosen time again
// when the order is placed (online-order-intake v11).
export default function WhenPicker({ location, orderType, status, value, onChange, refreshKey = 0 }) {
  const [times, setTimes] = useState(null); // null = loading/failed, [] = none
  const [loadFailed, setLoadFailed] = useState(false);
  const enabled = !!status?.preorders_enabled;
  const closed = enabled && !status.open_now;
  const paused = enabled && status.paused;
  const type = orderType === 'delivery' ? 'delivery' : 'pickup';

  useEffect(() => {
    if (!enabled || paused) return undefined;
    let alive = true;
    setTimes(null); setLoadFailed(false);
    fetchPreorderTimes(location, type).then((t) => {
      if (!alive) return;
      if (!t) { setLoadFailed(true); setTimes([]); return; }
      setTimes(t);
    });
    return () => { alive = false; };
  }, [enabled, paused, location, type, refreshKey]);

  const days = useMemo(() => groupByDay(times || []), [times]);

  // Closed: pre-order is the only choice; pick the first time once loaded.
  useEffect(() => {
    if (!enabled || paused) return;
    const valid = value?.at && (times || []).includes(value.at);
    if (closed && times && times.length && (!value || value.mode !== 'later' || !valid)) {
      onChange({ mode: 'later', at: times[0] });
    } else if (value?.mode === 'later' && times && value.at && !valid) {
      // The chosen time is gone (filled up or passed): fall back to the first one.
      onChange({ mode: 'later', at: times[0] || null });
    }
  }, [enabled, paused, closed, times]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!enabled) return null;

  if (paused) {
    return (
      <div className="rounded-app border border-line bg-surface p-5 mb-6" role="status">
        <p className="text-app font-semibold">We&rsquo;re not taking orders for a short while.</p>
        <p className="text-app-soft text-sm mt-1">Please try again soon.</p>
      </div>
    );
  }

  const mode = closed ? 'later' : (value?.mode || 'now');
  const selDayKey = value?.at ? days.find((d) => d.times.includes(value.at))?.key : days[0]?.key;
  const selDay = days.find((d) => d.key === selDayKey) || days[0];
  const readyIn = status?.ready_in_min ? `Ready in about ${status.ready_in_min} min` : '';

  return (
    <div className="mb-6" role="group" aria-label="When would you like your order?">
      {closed && (
        <div className="rounded-app border border-line bg-surface p-4 mb-3">
          <p className="text-app font-semibold">We&rsquo;re closed right now.</p>
          <p className="text-app-soft text-sm mt-0.5">{opensSentence(status)} You can pre-order for later.</p>
        </div>
      )}

      {!closed && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button type="button" aria-pressed={mode === 'now'}
            onClick={() => onChange({ mode: 'now', at: null })}
            className={`rounded-app border p-4 text-left transition ${mode === 'now' ? 'border-highlight bg-highlight-wash' : 'border-line bg-surface'}`}>
            <span className="block text-app font-semibold">Order now</span>
            {readyIn && <span className="block text-app-soft text-xs mt-1">{readyIn}</span>}
          </button>
          <button type="button" aria-pressed={mode === 'later'}
            onClick={() => onChange({ mode: 'later', at: value?.at && (times || []).includes(value.at) ? value.at : (times && times[0]) || null })}
            className={`rounded-app border p-4 text-left transition ${mode === 'later' ? 'border-highlight bg-highlight-wash' : 'border-line bg-surface'}`}>
            <span className="block text-app font-semibold">Pre-order for later</span>
            <span className="block text-app-soft text-xs mt-1">Pick a day and time</span>
          </button>
        </div>
      )}

      {mode === 'later' && (
        <div className="rounded-app border border-line bg-surface p-4">
          {times === null && <p className="text-app-soft text-sm">Loading times&hellip;</p>}
          {times !== null && !days.length && (
            <p className="text-app-soft text-sm">
              {loadFailed ? 'We couldn’t load pickup times. Please try again in a moment.' : 'There are no times left this week. Please call the store.'}
            </p>
          )}
          {days.length > 0 && (
            <>
              <p className="text-app-faint text-xs font-semibold uppercase tracking-wide mb-2">{type === 'delivery' ? 'Delivery day' : 'Pickup day'}</p>
              <div className="flex gap-2 overflow-x-auto pb-1 mb-3" role="radiogroup" aria-label="Day">
                {days.map((d) => (
                  <button key={d.key} type="button" role="radio" aria-checked={d.key === selDay?.key}
                    onClick={() => onChange({ mode: 'later', at: d.times[0] })}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm whitespace-nowrap ${d.key === selDay?.key ? 'border-highlight bg-highlight text-on-highlight font-semibold' : 'border-line text-app-soft'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="text-app-faint text-xs font-semibold uppercase tracking-wide">{type === 'delivery' ? 'Delivery time' : 'Pickup time'}</span>
                <select className="input w-full mt-1" value={value?.at && selDay?.times.includes(value.at) ? value.at : ''}
                  onChange={(e) => onChange({ mode: 'later', at: e.target.value || null })}>
                  {!(value?.at && selDay?.times.includes(value.at)) && <option value="">Choose a time</option>}
                  {(selDay?.times || []).map((t) => (
                    <option key={t} value={t}>{type === 'delivery' ? `Around ${timeLabel(t)}` : timeLabel(t)}</option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
}
