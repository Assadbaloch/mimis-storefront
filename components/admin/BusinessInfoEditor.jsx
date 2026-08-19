'use client';
import { useEffect, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';

// Business info shown on the site, per location.
//
// IMPORTANT: this edits DISPLAY fields only (display_name, display_address,
// display_phone, status_label) plus opening hours. The operational address and
// phone -- the ones Uber Direct uses to send a courier -- are separate columns
// that Postgres will not let this page write. A typo here is cosmetic and can
// never misroute a delivery. See THEME-SYSTEM-SPEC §4b.

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function BusinessInfoEditor() {
  const [locations, setLocations] = useState([]);
  const [hours, setHours] = useState({});
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = getSupabasePublicClient();
    const [{ data: locs }, { data: hrs }] = await Promise.all([
      supabase.from('store_locations').select('*').order('location'),
      supabase.from('store_hours').select('*'),
    ]);
    setLocations(locs || []);
    const map = {};
    for (const l of locs || []) {
      map[l.location] = DAYS.map((_, d) => {
        const row = (hrs || []).find((h) => h.location === l.location && h.weekday === d);
        return row || { location: l.location, weekday: d, opens_at: '', closes_at: '', closed: false };
      });
    }
    setHours(map);
    setLoading(false);
  }

  function editLoc(location, patch) {
    setLocations((prev) => prev.map((l) => (l.location === location ? { ...l, ...patch } : l)));
  }

  function editHour(location, weekday, patch) {
    setHours((prev) => ({
      ...prev,
      [location]: prev[location].map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)),
    }));
  }

  async function save() {
    setStatus('Saving…');
    const supabase = getSupabasePublicClient();
    try {
      for (const l of locations) {
        const { error } = await supabase.from('store_locations').update({
          display_name: l.display_name,
          display_address: l.display_address,
          display_phone: l.display_phone,
          status_label: l.status_label,
          google_place_id: l.google_place_id || null,
        }).eq('location', l.location);
        if (error) throw error;
      }
      // Replace this location's hours wholesale — simpler and avoids partial
      // rows lingering when a day is switched to closed.
      for (const [location, rows] of Object.entries(hours)) {
        await supabase.from('store_hours').delete().eq('location', location);
        const toInsert = rows.map((r) => ({
          location, weekday: r.weekday,
          opens_at: r.closed || !r.opens_at ? null : r.opens_at,
          closes_at: r.closed || !r.closes_at ? null : r.closes_at,
          closed: !!r.closed, sort_order: 0,
        }));
        const { error } = await supabase.from('store_hours').insert(toInsert);
        if (error) throw error;
      }
      setStatus('Saved');
    } catch (e) {
      setStatus(`Could not save: ${e.message}`);
    }
    setTimeout(() => setStatus(''), 3000);
  }

  if (loading) return <p className="text-cream/50 text-sm py-6">Loading business info…</p>;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-serif font-bold text-xl text-cream">Business Info</h2>
        <button onClick={save} className="btn-primary text-sm">Save</button>
      </div>
      <p className="text-cream/50 text-xs mb-5">
        What customers see on the website. Delivery pickup details are held separately
        and are not affected by changes here.
      </p>
      {status && <p className={`text-sm mb-3 ${status === 'Saved' ? 'text-gold' : 'text-cream/60'}`}>{status}</p>}

      <div className="space-y-6">
        {locations.map((l) => (
          <div key={l.location} className="rounded-xl border border-cream/12 bg-cream/[0.03] p-4">
            <h3 className="text-cream font-semibold mb-3">{l.location}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Field label="Display name" value={l.display_name} onChange={(v) => editLoc(l.location, { display_name: v })} />
              <Field label="Status" value={l.status_label} onChange={(v) => editLoc(l.location, { status_label: v })} />
              <Field label="Address (as shown)" value={l.display_address} onChange={(v) => editLoc(l.location, { display_address: v })} />
              <Field label="Phone (as shown)" value={l.display_phone} onChange={(v) => editLoc(l.location, { display_phone: v })} />
              {/* Public identifier, safe to store and display. The Places API
                  key it pairs with is server-only and never lives here. */}
              <Field label="Google Place ID (for live reviews)" value={l.google_place_id}
                onChange={(v) => editLoc(l.location, { google_place_id: v })} />
              <p className="text-cream/40 text-xs -mt-1">
                Find it with Google&rsquo;s Place ID Finder. Leave blank to turn live reviews off for this location.
              </p>
            </div>

            <p className="text-cream/60 text-xs uppercase tracking-wide mb-2">Opening hours</p>
            <div className="space-y-1">
              {(hours[l.location] || []).map((h) => (
                <div key={h.weekday} className="flex items-center gap-2 text-sm">
                  <span className="text-cream/70 w-24 shrink-0">{DAYS[h.weekday]}</span>
                  <label className="flex items-center gap-1 text-cream/55 text-xs">
                    <input type="checkbox" checked={!!h.closed}
                      onChange={(e) => editHour(l.location, h.weekday, { closed: e.target.checked })} />
                    Closed
                  </label>
                  {!h.closed && (
                    <>
                      <input type="time" value={h.opens_at || ''}
                        onChange={(e) => editHour(l.location, h.weekday, { opens_at: e.target.value })}
                        className="bg-ink border border-cream/15 rounded px-2 py-1 text-cream text-xs" />
                      <span className="text-cream/40">to</span>
                      <input type="time" value={h.closes_at || ''}
                        onChange={(e) => editHour(l.location, h.weekday, { closes_at: e.target.value })}
                        className="bg-ink border border-cream/15 rounded px-2 py-1 text-cream text-xs" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-cream/60 text-xs uppercase tracking-wide mb-1">{label}</label>
      <input className="input w-full" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
