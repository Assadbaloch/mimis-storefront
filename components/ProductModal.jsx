'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { formatPrice, displayName } from '@/lib/format';
import { useCart } from '@/lib/cart';
import Gallery from '@/components/Gallery';

export default function ProductModal({ item, onClose }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [added, setAdded] = useState(false);
  const [media, setMedia] = useState(item.media || null);
  const name = displayName(item.name);
  const description = item.description_override || null;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Gallery rows aren't part of the grid's lean menu_items query (kept fast
  // on purpose), so fetch them lazily the moment a customer actually opens
  // a product -- only paid for when someone looks.
  useEffect(() => {
    if (item.media || !item.id) return;
    let cancelled = false;
    getSupabasePublicClient()
      .from('menu_item_media')
      .select('media_type, url, sort_order')
      .eq('item_id', item.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setMedia(data);
      });
    return () => {
      cancelled = true;
    };
  }, [item.id, item.media]);

  function handleAdd() {
    addItem({
      clover_item_id: item.clover_item_id,
      name,
      price_cents: item.price_cents,
      quantity,
      modifiers: [],
      special_instructions: specialInstructions.trim(),
      image_url: item.image_url,
    });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 700);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-[#16100b] border border-cream/10 animate-sheet-up md:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-ink/80 text-cream flex items-center justify-center hover:bg-ink transition-colors"
        >
          ✕
        </button>

        <Gallery
          media={media}
          fallbackImage={item.image_url}
          fallbackVideo={item.video_url}
          name={name}
          badgeText={item.badge_text}
        />

        <div className="px-5 md:px-6 pb-5 md:pb-6 pt-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-serif font-bold text-2xl text-cream leading-snug">{name}</h2>
            <span className="text-gold font-serif font-semibold text-xl whitespace-nowrap">{formatPrice(item.price_cents)}</span>
          </div>

          {description ? (
            <p className="text-cream/65 text-sm leading-relaxed mt-3">{description}</p>
          ) : (
            <p className="text-cream/35 text-sm leading-relaxed mt-3 italic">Hand-prepared fresh to order.</p>
          )}

          <Link
            href={`/menu/${item.clover_item_id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-gold/80 hover:text-gold text-xs font-bold uppercase tracking-wide mt-3 transition-colors"
          >
            View full details
            <span aria-hidden="true">→</span>
          </Link>

          <label className="block mt-5">
            <span className="text-cream/50 text-xs uppercase tracking-wide font-bold">Special instructions (optional)</span>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. extra crispy, no onions..."
              rows={2}
              className="input w-full mt-2 !text-sm"
            />
          </label>

          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-3 rounded-full border border-cream/15 px-2 py-1.5">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="w-8 h-8 rounded-full flex items-center justify-center text-cream/80 hover:bg-cream/10 transition-colors text-lg"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold text-cream">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
                className="w-8 h-8 rounded-full flex items-center justify-center text-cream/80 hover:bg-cream/10 transition-colors text-lg"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAdd}
              className={`btn-primary !px-6 ${added ? 'animate-pulse-once' : ''}`}
            >
              {added ? 'Added ✓' : `Add ${quantity > 1 ? quantity + ' ' : ''}to Cart · ${formatPrice(item.price_cents * quantity)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
