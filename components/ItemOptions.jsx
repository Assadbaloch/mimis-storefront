'use client';
import { formatPrice } from '@/lib/format';
import { optionGroups, toggleOption } from '@/lib/options';

// The item's options exactly as Clover lists them: same group names, same
// option names, same prices, same order. `selected` is an array of Clover
// modifier ids; `onChange` receives the next array.
export default function ItemOptions({ item, selected, onChange }) {
  const groups = optionGroups(item);
  if (!groups.length) return null;

  return (
    <div className="mt-5 space-y-5">
      {groups.map((g) => (
        <fieldset key={g.id}>
          <legend className="flex items-center gap-2 mb-2">
            <span className="text-app-soft text-xs uppercase tracking-wide font-bold">{g.name}</span>
            {g.required ? (
              <span className="text-[10px] font-bold uppercase tracking-wide text-highlight border border-highlight-line rounded-full px-2 py-0.5">Required · choose one</span>
            ) : g.single ? (
              <span className="text-[10px] text-app-faint">Choose one (optional)</span>
            ) : (
              <span className="text-[10px] text-app-faint">Optional</span>
            )}
          </legend>
          <div className="flex flex-wrap gap-2">
            {g.options.map((o) => {
              const on = selected.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  role={g.single ? 'radio' : 'checkbox'}
                  aria-checked={on}
                  onClick={() => onChange(toggleOption(item, selected, g.id, o.id))}
                  style={{ borderColor: on ? 'var(--mimis-accent, currentColor)' : undefined }}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    on ? 'bg-accent text-on-accent font-semibold' : 'border-line text-app-soft hover:bg-app-wash'
                  }`}
                >
                  {o.name}
                  {o.price_cents > 0 && <span className={on ? 'opacity-90' : 'text-app-faint'}> +{formatPrice(o.price_cents)}</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
