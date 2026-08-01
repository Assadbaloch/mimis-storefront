'use client';
import Image from 'next/image';
import { formatPrice, displayName } from '@/lib/format';
import { useCart } from '@/lib/cart';
import { useEffect, useState } from 'react';
import ProductModal from '@/components/ProductModal';

// autoOpen: true when this card is the deep-link target of a `/menu?item=<clover_item_id>`
// URL (e.g. from the rewards-page trending banner) -- opens the product modal
// itself on arrival, satisfying the "direct the customer to the product" goal
// rather than just scrolling them to the right category.
export default function MenuItemCard({ item, large = false, autoOpen = false }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const name = displayName(item.name);
  const description = item.description_override || null;

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
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
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
          <button onClick={handleAdd} className="btn-primary mt-auto self-start !px-4 !py-2 !text-[11px] active:scale-95 transition-transform">
            {added ? 'Added ✓' : 'Add to Cart'}
          </button>
        </div>
      </div>
      {showModal && <ProductModal item={item} onClose={() => setShowModal(false)} />}
    </>
  );
}
