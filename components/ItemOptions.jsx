'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatPrice } from '@/lib/format';
import { optionSections, toggleOption } from '@/lib/options';

// The item sheet's options. Sections and headings are ours (so a customer can
// tell what each one is); every option name, price and the order inside a
// section are Clover's, untouched. `selected` is an array of Clover modifier
// ids; `onChange` receives the next array. `attention` ({ key, n }) opens and
// scrolls to a section, used when Add is tapped with a required choice missing.
//
// Border colours are set inline: the reference design sets border-color on
// every element, which outranks Tailwind border colour utilities.
const LINE = 'var(--mimis-line)';
const GOLD = 'var(--mimis-highlight)';

export default function ItemOptions({ item, selected, onChange, attention }) {
  const uid = useId();
  const sections = useMemo(() => optionSections(item), [item]);
  const [open, setOpen] = useState(() => {
    const o = {};
    sections.forEach((s) => { o[s.key] = s.required || sections.length <= 2; });
    return o;
  });
  const [flash, setFlash] = useState(null);
  const refs = useRef({});

  useEffect(() => {
    if (!attention?.key) return;
    setOpen((o) => ({ ...o, [attention.key]: true }));
    setFlash(attention.key);
    const el = refs.current[attention.key];
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    const t = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
  }, [attention]);

  if (!sections.length) return null;

  const toggle = (g, id) => onChange(toggleOption(item, selected, g.id, id));

  return (
    <div className="space-y-3">
      {sections.map((s) => {
        const chosen = s.groups.flatMap((g) => g.options.filter((o) => selected.includes(o.id)));
        const isOpen = !!open[s.key];
        const flagged = flash === s.key;
        const summary =
          chosen.length > 0 ? chosen.map((o) => o.name).join(', ') : s.kind === 'crust' ? 'Regular' : null;
        const panelId = `${uid}-${s.key}`;
        return (
          <section
            key={s.key}
            ref={(el) => { refs.current[s.key] = el; }}
            className={`rounded-app border bg-surface transition-shadow ${flagged ? 'animate-pulse-once' : ''}`}
            style={{
              borderColor: flagged ? GOLD : LINE,
              boxShadow: flagged ? '0 0 0 3px color-mix(in srgb, var(--mimis-highlight) 25%, transparent)' : undefined,
            }}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen((o) => ({ ...o, [s.key]: !o[s.key] }))}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="font-serif font-semibold text-[17px] leading-tight text-app">{s.title}</span>
                  {s.required && (
                    <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-highlight text-on-highlight">
                      Required
                    </span>
                  )}
                </span>
                <span className={`block text-[13px] mt-1 truncate ${summary ? 'text-app font-medium' : 'text-app-soft'}`}>
                  {summary ? (
                    <>
                      <span className="text-highlight mr-1" aria-hidden="true">✓</span>
                      {summary}
                    </>
                  ) : (
                    s.hint
                  )}
                </span>
              </span>
              {s.kind !== 'crust' && s.kind !== 'radio' && chosen.length > 0 && (
                <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-highlight text-on-highlight text-[11px] font-bold flex items-center justify-center">
                  {chosen.length}
                </span>
              )}
              <Chevron open={isOpen} />
            </button>

            {isOpen && (
              <div id={panelId} className="px-4 pb-4 animate-fade-in">
                {s.kind === 'tabs' ? (
                  <ToppingTabs section={s} selected={selected} onToggle={toggle} />
                ) : s.kind === 'crust' ? (
                  <RadioList
                    label={s.title}
                    rows={[
                      { id: '__regular', name: 'Regular', price_cents: 0, on: chosen.length === 0, pick: () => onChange(selected.filter((id) => !s.groups.some((g) => g.options.some((o) => o.id === id)))) },
                      ...s.groups.flatMap((g) => g.options.map((o) => ({ ...o, on: selected.includes(o.id), pick: () => !selected.includes(o.id) && toggle(g, o.id) }))),
                    ]}
                    plus
                  />
                ) : s.kind === 'radio' ? (
                  <RadioList
                    label={s.title}
                    rows={s.groups[0].options.map((o) => ({ ...o, on: selected.includes(o.id), pick: () => toggle(s.groups[0], o.id) }))}
                    plus={!s.required}
                  />
                ) : (
                  <Tiles group={s.groups[0]} selected={selected} onToggle={toggle} />
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Chevron({ open }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"
      className={`shrink-0 text-app-soft transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function price(cents, plus) {
  if (!cents) return null;
  return `${plus ? '+' : ''}${formatPrice(cents)}`;
}

// Pick-one groups (half & half, crust, size): full-width rows, radio on the left,
// price on the right. Tapping the chosen row of an optional group clears it.
function RadioList({ label, rows, plus }) {
  return (
    <div role="radiogroup" aria-label={label} className="rounded-app-sm border overflow-hidden" style={{ borderColor: LINE }}>
      {rows.map((r, i) => (
        <button
          key={r.id}
          type="button"
          role="radio"
          aria-checked={r.on}
          onClick={r.pick}
          className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors ${r.on ? 'bg-highlight-wash' : 'hover:bg-app-wash'}`}
          style={{ borderTop: i === 0 ? 'none' : `1px solid ${LINE}` }}
        >
          <span
            className="shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors"
            style={{ borderColor: r.on ? GOLD : 'color-mix(in srgb, var(--mimis-text) 30%, transparent)' }}
          >
            {r.on && <span className="w-2 h-2 rounded-full bg-highlight" />}
          </span>
          <span className={`flex-1 text-sm ${r.on ? 'text-app font-semibold' : 'text-app'}`}>{r.name}</span>
          {price(r.price_cents, plus) && <span className="text-sm text-app-soft tabular-nums">{price(r.price_cents, plus)}</span>}
        </button>
      ))}
    </div>
  );
}

// Pick-many groups (toppings, remove, extras): a tidy two-column grid.
function Tiles({ group, selected, onToggle }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label={group.name}>
      {group.options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(group, o.id)}
            className={`flex items-center gap-2.5 rounded-app-sm border px-3 py-2.5 min-h-[52px] text-left transition-colors ${on ? 'bg-highlight-wash' : 'bg-surface-strong hover:bg-app-wash'}`}
            style={{ borderColor: on ? GOLD : LINE }}
          >
            <span
              className={`shrink-0 w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-colors ${on ? 'bg-highlight' : ''}`}
              style={{ borderColor: on ? GOLD : 'color-mix(in srgb, var(--mimis-text) 30%, transparent)' }}
            >
              {on && (
                <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" className="text-on-highlight">
                  <path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="min-w-0">
              <span className={`block text-[13px] leading-snug ${on ? 'text-app font-semibold' : 'text-app'}`}>{o.name}</span>
              {o.price_cents > 0 && <span className="block text-[11px] text-app-soft tabular-nums mt-0.5">+{formatPrice(o.price_cents)}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Toppings: one section, tabs for whole pizza / left half / right half.
function ToppingTabs({ section, selected, onToggle }) {
  const [tab, setTab] = useState(0);
  const current = section.tabs[Math.min(tab, section.tabs.length - 1)];
  return (
    <div>
      <div role="tablist" className="flex p-1 rounded-full bg-app-wash mb-3">
        {section.tabs.map((t, i) => {
          const n = t.group.options.filter((o) => selected.includes(o.id)).length;
          const active = i === tab;
          return (
            <button
              key={t.group.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(i)}
              className={`flex-1 min-w-0 rounded-full px-2 py-2 text-[12px] font-semibold transition-all ${active ? 'bg-surface-strong text-app shadow-sm' : 'text-app-soft hover:text-app'}`}
            >
              <span className="truncate">{t.label}</span>
              {n > 0 && (
                <span className="ml-1.5 inline-flex min-w-[18px] h-[18px] px-1 rounded-full bg-highlight text-on-highlight text-[10px] font-bold items-center justify-center align-middle">
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Tiles group={current.group} selected={selected} onToggle={onToggle} />
    </div>
  );
}
