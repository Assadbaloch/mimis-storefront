'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { formatPrice, displayName } from '@/lib/format';
import Gallery from '@/components/Gallery';
import ProductDetailActions from '@/components/ProductDetailActions';
import { fromPrice } from '@/lib/options';

export default function ProductModal({ item, onClose }) {
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
  // Keyed on product_id, not item_id: the gallery belongs to the product, so
  // a set of photos uploaded once appears at both restaurants rather than
  // having to be re-uploaded against each location's own menu_items row.
  useEffect(() => {
    if (item.media || !item.product_id) return;
    let cancelled = false;
    getSupabasePublicClient()
      .from('menu_item_media')
      .select('media_type, url, sort_order')
      .eq('product_id', item.product_id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setMedia(data);
      });
    return () => {
      cancelled = true;
    };
  }, [item.product_id, item.media]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-app-lg md:rounded-app-lg bg-surface-strong border border-line animate-sheet-up md:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-scrim text-white flex items-center justify-center hover:bg-black/80 transition-colors"
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
            <h2 className="font-serif font-bold text-2xl text-app leading-snug">{name}</h2>
            <span className="text-highlight font-serif font-semibold text-xl whitespace-nowrap">{item.price_cents > 0 ? formatPrice(item.price_cents) : `from ${formatPrice(fromPrice(item))}`}</span>
          </div>

          {description ? (
            <p className="text-app-soft text-sm leading-relaxed mt-3">{description}</p>
          ) : (
            <p className="text-app-faint text-sm leading-relaxed mt-3 italic">Hand-prepared fresh to order.</p>
          )}

          <Link
            href={`/menu/${item.clover_item_id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-highlight hover:opacity-80 text-xs font-bold uppercase tracking-wide mt-3 transition-opacity"
          >
            View full details
            <span aria-hidden="true">→</span>
          </Link>

          <ProductDetailActions item={item} name={name} compact onAdded={onClose} />
        </div>
      </div>
    </div>
  );
}
