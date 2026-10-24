'use client';
import SharpImage from '@/components/SharpImage';
import { formatPrice, displayName, cleanBadge } from '@/lib/format';
import { useCart, cartKeyFor } from '@/lib/cart';
import { useEffect, useState } from 'react';
import ProductModal from '@/components/ProductModal';
import { needsChoice, fromPrice } from '@/lib/options';
import { useLocation } from '@/lib/location';
import { useStoreStatus } from '@/lib/useStoreStatus';
import { orderingState } from '@/lib/storeHours';

// autoOpen: true when this card is the deep-link target of a `/menu?item=<clover_item_id>`
// URL (e.g. from the rewards-page trending banner) -- opens the product modal
// itself on arrival, satisfying the "direct the customer to the product" goal
// rather than just scrolling them to the right category.
export default function MenuItemCard({ item, large = false, autoOpen = false, initialVariantId = null }) {
  const { items, addItem, updateQuantity } = useCart();
  // Pre-orders: "Pre-order" instead of "Add to Cart" while closed (only when
  // the owner switched website pre-orders on).
  const { location: storeLocation } = useLocation();
  const ordering = orderingState(useStoreStatus(storeLocation));
  const preorderOnly = ordering === 'preorder';
  const closedNow = ordering === 'closed';
  const [showModal, setShowModal] = useState(false);
  const name = displayName(item.name);
  const description = item.description_override || null;

  // A dish sold in sizes (lib/variants.js) shows its sizes as buttons on the
  // card. The picked size is one real Clover item: the card's price, Add and
  // stepper all act on it, and opening the card opens it on that size.
  const variants = Array.isArray(item.variants) && item.variants.length > 1 ? item.variants : null;
  // Drinks grouped by container (Soda: Can, bottle, 2 litre) have long labels
  // and flavour choices, so their card opens the sheet instead of showing chips.
  const chips = variants && item.variant_kind !== 'type';
  const [sizeId, setSizeId] = useState(variants ? variants[0].clover_item_id : null);
  const current = variants ? variants.find((v) => v.clover_item_id === sizeId) || variants[0] : item;

  // The plain line this card adds to: no modifiers, no instructions. Anything
  // added through the modal with special instructions is a separate line and
  // is deliberately not counted or altered here.
  const plainKey = cartKeyFor({ clover_item_id: current.clover_item_id });
  const quantity = variants && !chips ? 0 : items.find((i) => i._key === plainKey)?.quantity || 0;

  useEffect(() => {
    if (autoOpen) setShowModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAdd(e) {
    e.stopPropagation();
    // An item priced entirely by a size choice (wings, fries) can't be added
    // plain -- open the sheet so the customer picks, exactly like the register.
    if (variants ? !chips || needsChoice(current) || !(current.price_cents > 0) : needsChoice(item)) { setShowModal(true); return; }
    addItem({
      clover_item_id: current.clover_item_id,
      name: displayName(current.name),
      price_cents: current.price_cents,
      quantity: 1,
      modifiers: [],
      special_instructions: '',
      image_url: current.image_url || item.image_url,
    });
  }

  function step(e, delta) {
    e.stopPropagation();
    updateQuantity(plainKey, quantity + delta);
  }

  // The card itself is a button that opens the product. Key presses on the
  // stepper would otherwise bubble up to it and open the modal on every tap of
  // plus or minus.
  function swallowKeys(e) {
    if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowModal(true)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setShowModal(true)}
        className={`menu-card group rounded-app overflow-hidden bg-surface border flex flex-col cursor-pointer ${
          autoOpen ? 'border-highlight-line ring-2 ring-highlight-line animate-pulse-once' : 'border-line hover:border-highlight-line'
        }`}
      >
        <div className={`relative overflow-hidden ${large ? 'aspect-[4/3]' : 'aspect-square'} bg-gradient-to-br from-app-wash to-black/40`}>
          {item.video_url ? (
            <video
              src={item.video_url}
              autoPlay
              muted
              loop
              playsInline
              className="menu-media absolute inset-0 w-full h-full object-cover"
            />
          ) : item.image_url ? (
            <SharpImage src={item.image_url} alt={name} className="menu-media object-cover" sizes="(max-width: 768px) 67vw, 34vw" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif italic text-highlight opacity-30 text-3xl">Mimi&rsquo;s</span>
            </div>
          )}
          {(cleanBadge(item.badge_text) || item.popular) && (
            <span className="absolute top-2.5 left-2.5 md:top-3 md:left-3 text-[10px] font-bold uppercase tracking-wide text-highlight border border-highlight-line rounded-full px-2.5 py-1 bg-scrim">
              {cleanBadge(item.badge_text) || 'Most ordered'}
            </span>
          )}
        </div>
        <div className="p-3 sm:p-4 flex flex-col gap-1.5 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5 sm:gap-2">
            <h3 className="font-serif font-semibold text-app text-[14px] sm:text-[15px] leading-snug">{name}</h3>
            <span className="text-highlight font-serif font-semibold text-[14px] sm:text-[15px] whitespace-nowrap">{variants && !chips ? `from ${formatPrice(item.price_cents)}` : current.price_cents > 0 ? formatPrice(current.price_cents) : `from ${formatPrice(fromPrice(current))}`}</span>
          </div>
          {description && <p className="text-app-soft text-xs leading-relaxed line-clamp-2">{description}</p>}
          {chips && (
            <div role="radiogroup" aria-label={`${name} size`} className="flex flex-wrap gap-1 sm:gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()} onKeyDown={swallowKeys}>
              {variants.map((v) => {
                const on = v.clover_item_id === current.clover_item_id;
                return (
                  <button
                    key={v.clover_item_id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${v.size_label}, ${formatPrice(v.price_cents)}`}
                    onClick={() => setSizeId(v.clover_item_id)}
                    className={`min-w-[1.9rem] sm:min-w-[2.25rem] h-7 sm:h-8 px-1.5 sm:px-2 rounded-full text-[11px] font-bold border transition-colors ${on ? 'bg-accent text-on-accent' : 'text-app-soft hover:text-app'}`}
                    style={{ borderColor: on ? 'transparent' : 'var(--mimis-line)' }}
                  >
                    {shortSize(v.size_label)}
                  </button>
                );
              })}
            </div>
          )}
          {quantity === 0 ? (
            <button
              onClick={closedNow ? undefined : handleAdd}
              disabled={closedNow}
              aria-label={closedNow ? `Closed now, ${name} can be ordered when we open` : preorderOnly ? `Pre-order ${name}` : `Add ${name} to cart`}
              className="btn-primary mt-auto self-start !px-3 sm:!px-4 !py-2 !text-[11px] whitespace-nowrap active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {/* "Add to Cart" wrapped onto two lines on 320px phones. */}
              <span className="sm:hidden">{closedNow ? 'Closed' : preorderOnly ? 'Pre-order' : 'Add'}</span>
              <span className="hidden sm:inline">{closedNow ? 'Closed now' : preorderOnly ? 'Pre-order' : 'Add to Cart'}</span>
            </button>
          ) : (
            <div
              onKeyDown={swallowKeys}
              className="mt-auto self-start flex items-center gap-1 rounded-full bg-accent text-on-accent p-1 animate-fade-in"
            >
              <button
                onClick={(e) => step(e, -1)}
                aria-label={quantity === 1 ? `Remove ${name} from cart` : `Decrease ${name} quantity`}
                className="w-7 h-7 rounded-full grid place-items-center text-base leading-none hover:bg-on-accent-soft active:scale-90 transition-transform"
              >
                {quantity === 1 ? '✕' : '−'}
              </button>
              <span aria-live="polite" className="min-w-[1.5rem] text-center text-[13px] font-bold tabular-nums">
                {quantity}
              </span>
              <button
                onClick={(e) => step(e, 1)}
                aria-label={`Increase ${name} quantity`}
                className="w-7 h-7 rounded-full grid place-items-center text-base leading-none hover:bg-on-accent-soft active:scale-90 transition-transform"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
      {showModal && <ProductModal item={item} initialVariantId={initialVariantId || (variants ? current.clover_item_id : null)} onClose={() => setShowModal(false)} />}
    </>
  );
}

// "Medium 12\"" -> "M", "Large 14\"" -> "L", "X-Large 16\"" -> "XL", "6 pcs" -> "6 pc".
function shortSize(label) {
  const l = String(label || '');
  if (/^x-large/i.test(l)) return 'XL';
  if (/^large/i.test(l)) return 'L';
  if (/^medium/i.test(l)) return 'M';
  if (/pcs$/i.test(l)) return l.replace(/pcs$/i, 'pc');
  return l;
}
