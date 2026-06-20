'use client';
import Image from 'next/image';
import { formatPrice, displayName } from '@/lib/format';
import { useCart } from '@/lib/cart';
import { useState } from 'react';

export default function MenuItemCard({ item, large = false }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const name = displayName(item.name);
  const description = item.description_override || null;

  function handleAdd() {
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
    <div className="group rounded-2xl overflow-hidden bg-cream/[0.04] border border-cream/10 hover:border-gold/40 transition-colors flex flex-col">
      <div className={`relative ${large ? 'aspect-[4/3]' : 'aspect-square'} bg-gradient-to-br from-cream/10 to-black/40`}>
        {item.video_url ? (
          <video
            src={item.video_url}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : item.image_url ? (
          <Image src={item.image_url} alt={name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif italic text-gold/30 text-3xl">Mimi&rsquo;s</span>
          </div>
        )}
        {item.badge_text && (
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wide text-gold border border-gold/60 rounded-full px-2.5 py-1 bg-ink/70">
            {item.badge_text}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif font-semibold text-cream text-[15px] leading-snug">{name}</h3>
          <span className="text-gold font-serif font-semibold text-[15px] whitespace-nowrap">{formatPrice(item.price_cents)}</span>
        </div>
        {description && <p className="text-cream/55 text-xs leading-relaxed line-clamp-2">{description}</p>}
        <button onClick={handleAdd} className="btn-primary mt-auto self-start !px-4 !py-2 !text-[11px]">
          {added ? 'Added ✓' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
