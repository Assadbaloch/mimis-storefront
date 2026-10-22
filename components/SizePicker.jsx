'use client';
import { formatPrice } from '@/lib/format';

// Size choice for a dish whose sizes are separate Clover items (lib/variants.js).
// Each row is one real Clover item with its own price; picking a row swaps the
// item the sheet adds to the cart. Same look as the option rows in ItemOptions.
// Border colours inline: the reference design overrides Tailwind border colours.
const LINE = 'var(--mimis-line)';
const GOLD = 'var(--mimis-highlight)';

export default function SizePicker({ variants, value, onChange, title = 'Choose your size' }) {
  return (
    <section className="rounded-app border bg-surface" style={{ borderColor: LINE }}>
      <div className="px-4 pt-3.5 pb-3">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-serif font-semibold text-[17px] leading-tight text-app">{title}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-highlight text-on-highlight">
            Required
          </span>
        </span>
      </div>
      <div className="px-4 pb-4">
 <div role="radiogroup" aria-label={title} className="rounded-app-sm border overflow-hidden" style={{ borderColor: LINE }}>
          {variants.map((v, i) => {
            const on = v.clover_item_id === value;
            return (
              <button
                key={v.clover_item_id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => !on && onChange(v.clover_item_id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors ${on ? 'bg-highlight-wash' : 'hover:bg-app-wash'}`}
                style={{ borderTop: i === 0 ? 'none' : `1px solid ${LINE}` }}
              >
                <span
                  className="shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors"
                  style={{ borderColor: on ? GOLD : 'color-mix(in srgb, var(--mimis-text) 30%, transparent)' }}
                >
                  {on && <span className="w-2 h-2 rounded-full bg-highlight" />}
                </span>
                <span className={`flex-1 text-sm ${on ? 'text-app font-semibold' : 'text-app'}`}>{v.size_label}</span>
                <span className="text-sm text-app-soft tabular-nums">{formatPrice(v.price_cents)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
