'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { formatPrice, displayName, displayCategory } from '@/lib/format';
import Gallery from '@/components/Gallery';
import ProductDetailActions from '@/components/ProductDetailActions';
import { fromPrice } from '@/lib/options';

// The item sheet.
//   Mobile: a bottom sheet up to the full screen height. Photo on top, then the
//   name, price, description and options, with the add bar pinned at the bottom.
//   Desktop: a wide two-panel window. The photo fills the left half; the right
//   half scrolls, with the add bar pinned at its bottom.
// The chat bubble is hidden while the sheet is open (it sits on top of
// everything and would cover the add bar); see body.mimis-sheet-open in
// globals.css.
const DESKTOP = '(min-width: 768px)';

function useIsDesktop() {
  // The sheet only ever renders after a tap, so window exists here.
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESKTOP).matches);
  useEffect(() => {
    const m = window.matchMedia(DESKTOP);
    const onChange = () => setDesktop(m.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);
  return desktop;
}

export default function ProductModal({ item, onClose }) {
  const [media, setMedia] = useState(item.media || null);
  const desktop = useIsDesktop();
  const [solid, setSolid] = useState(false);
  const name = displayName(item.name);
  const description = item.description_override || null;
  const category = item.category ? displayCategory(item.category) : null;
  const priceLabel = item.price_cents > 0 ? formatPrice(item.price_cents) : `from ${formatPrice(fromPrice(item))}`;

  useEffect(() => {
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    body.classList.add('mimis-sheet-open');
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => {
      body.style.overflow = prevOverflow;
      body.classList.remove('mimis-sheet-open');
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

  const gallery = (props) => (
    <Gallery
      media={media}
      fallbackImage={item.image_url}
      fallbackVideo={item.video_url}
      name={name}
      badgeText={item.badge_text}
      {...props}
    />
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in md:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={name}
        className="relative w-full md:max-w-[960px] max-h-[94dvh] md:h-[min(86vh,760px)] flex flex-col md:flex-row overflow-hidden rounded-t-app-lg md:rounded-app-lg bg-surface-strong shadow-2xl animate-sheet-up md:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {desktop && (
          <div className="w-[48%] shrink-0 bg-black">
            {gallery({ className: 'h-full flex flex-col', aspect: 'flex-1 min-h-0', sizes: '480px' })}
          </div>
        )}

        <div
          className="flex-1 min-w-0 min-h-0 overflow-y-auto overscroll-contain flex flex-col"
          onScroll={(e) => setSolid(e.currentTarget.scrollTop > (desktop ? 24 : 240))}
        >
          {/* Top bar: just the close button over the photo; once the photo has
              scrolled away it turns solid and shows the item name, so the close
              button never sits on top of an option. */}
          <div className="sticky top-0 z-30 h-0">
            <div
              className={`absolute inset-x-0 top-0 h-14 flex items-center gap-3 pl-5 md:pl-7 pr-3 transition-colors duration-200 ${solid ? 'bg-surface-strong border-b' : ''}`}
              style={{ borderColor: solid ? 'var(--mimis-line)' : 'transparent' }}
            >
              <span className={`flex-1 min-w-0 truncate font-serif font-semibold text-[17px] text-app transition-opacity duration-200 ${solid ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!solid}>
                {name}
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${solid ? 'bg-app-wash text-app hover:bg-app-tint' : 'bg-scrim text-white hover:bg-black/80'}`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {!desktop && gallery({ aspect: 'aspect-[4/3]', sizes: '100vw' })}

          <header className="px-5 md:px-7 pt-5 md:pt-8">
            {category && <p className="section-label mb-1.5">{category}</p>}
            <h2 className="font-serif font-bold text-[26px] md:text-[30px] text-app leading-tight pr-10">{name}</h2>
            <p className="font-serif font-semibold text-xl text-highlight mt-1.5">{priceLabel}</p>
            {description ? (
              <p className="text-app-soft text-sm leading-relaxed mt-3">{description}</p>
            ) : (
              <p className="text-app-faint text-sm leading-relaxed mt-3 italic">Hand-prepared fresh to order.</p>
            )}
            <Link
              href={`/menu/${item.clover_item_id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-app-soft hover:text-highlight text-[11px] font-bold uppercase tracking-wide mt-3 transition-colors"
            >
              View full details <span aria-hidden="true">→</span>
            </Link>
          </header>

          <ProductDetailActions item={item} name={name} variant="modal" onAdded={onClose} />
        </div>
      </div>
    </div>
  );
}
