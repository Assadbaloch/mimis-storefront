'use client';
import Image from 'next/image';
import { formatPrice, displayName } from '@/lib/format';
import { useCart, cartKeyFor } from '@/lib/cart';
import { useEffect, useState } from 'react';
import ProductModal from '@/components/ProductModal';

// autoOpen: true when this card is the deep-link target of a `/menu?item=<clover_item_id>`
// URL (e.g. from the rewards-page trending banner) -- opens the product modal
// itself on arrival, satisfying the "direct the customer to the product" goal
// rather than just scrolling them to the right category.
export default function MenuItemCard({ item, large = false, autoOpen = false }) {
  const { items, addItem, updateQuantity } = useCart();
  const [showModal, setShowModal] = useState(false);
  const name = displayName(item.name);
  const description = item.description_override || null;

  // The plain line this card adds to: no modifiers, no instructions. Anything
  // added through the modal with special instructions is a separate line and
  // is deliberately not counted or altered here.
  const plainKey = cartKeyFor({ clover_item_id: item.clover_item_id });
  const quantity = items.find((i) => i._key === plainKey)?.quantity || 0;

  useEffect(() => {
    if (autoOpen) setShowModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAdd(e) {
    e.stopPropagation();
    addItem({
      clover_item_id: item.clover_item_id,
      name,
      price_cents: item.price_cents,
      quantity: 1,
      modifiers: [],
      special_instructions: '',
      image_url: item.image_url,
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
            <Image src={item.image_url} alt={name} fill className="menu-media object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif italic text-highlight opacity-30 text-3xl">Mimi&rsquo;s</span>
            </div>
          )}
          {item.badge_text && (
            <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wide text-highlight border border-highlight-line rounded-full px-2.5 py-1 bg-scrim">
              {item.badge_text}
            </span>
          )}
        </div>
        <div className="p-4 flex flex-col gap-1.5 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif font-semibold text-app text-[15px] leading-snug">{name}</h3>
            <span className="text-highlight font-serif font-semibold text-[15px] whitespace-nowrap">{formatPrice(item.price_cents)}</span>
          </div>
          {description && <p className="text-app-soft text-xs leading-relaxed line-clamp-2">{description}</p>}
          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              aria-label={`Add ${name} to cart`}
              className="btn-primary mt-auto self-start !px-4 !py-2 !text-[11px] active:scale-95 transition-transform"
            >
              Add to Cart
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
      {showModal && <ProductModal item={item} onClose={() => setShowModal(false)} />}
    </>
  );
}
