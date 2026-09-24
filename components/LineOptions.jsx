import { formatPrice } from '@/lib/format';

// The options on a cart / order line, exactly as Clover names and prices them.
export default function LineOptions({ modifiers, className = '' }) {
  let mods = modifiers;
  if (typeof mods === 'string') { try { mods = JSON.parse(mods); } catch { mods = []; } }
  if (!Array.isArray(mods) || !mods.length) return null;
  return (
    <ul className={`text-app-faint text-xs mt-0.5 space-y-0.5 ${className}`}>
      {mods.filter((m) => m && m.name).map((m, i) => (
        <li key={i}>
          {m.name}
          {Number(m.price_cents) > 0 && <span> +{formatPrice(Number(m.price_cents))}</span>}
        </li>
      ))}
    </ul>
  );
}
