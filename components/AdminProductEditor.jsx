'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { formatPrice, displayName } from '@/lib/format';

// Editor for ONE canonical product (mimis.menu_products), replacing the old
// per-menu_items_row AdminItemEditor.
//
// Why this exists: menu_items is one row per (location, Clover item), so a
// product both restaurants carry had two rows -- and the old editor rendered a
// card for each. Uploading a photo for "Chicken Gyro" meant doing it twice,
// once per store, and the two could drift apart. Editing the product here
// writes once and a database trigger fans the content out to every linked
// location (see migration menu_products_sync_trigger).
//
// What is NOT editable here, by design: name, category, price and availability
// belong to Clover and differ per restaurant. They are shown read-only below,
// one line per location, so the owner can see what each store actually charges
// without being able to type a price that Clover would immediately overwrite.

function deriveCover(mediaList) {
  const image = mediaList.find((m) => m.media_type === 'image');
  const video = mediaList.find((m) => m.media_type === 'video');
  return { image_url: image?.url || '', video_url: video?.url || '' };
}

export default function AdminProductEditor({ product, items = [], onChanged }) {
  const supabase = getSupabasePublicClient();
  const dropInputRef = useRef(null);
  const dragIndexRef = useRef(null);

  const [fields, setFields] = useState({
    description: product.description || '',
    featured: product.featured,
    badge_text: product.badge_text || '',
    sort_order: product.sort_order ?? 0,
    image_url: product.image_url || '',
    video_url: product.video_url || '',
  });
  const [media, setMedia] = useState(null); // null = not loaded yet
  const [expanded, setExpanded] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');

  function set(field, value) {
    setFields((f) => ({ ...f, [field]: value }));
  }

  async function loadMedia() {
    const { data, error: loadError } = await supabase
      .from('menu_item_media')
      .select('id, media_type, url, sort_order')
      .eq('product_id', product.id)
      .order('sort_order', { ascending: true });
    if (loadError) {
      setError(loadError.message);
      setMedia([]);
    } else {
      setMedia(data || []);
    }
  }

  async function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next && media === null) await loadMedia();
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase
      .from('menu_products')
      .update({
        description: fields.description || null,
        featured: fields.featured,
        badge_text: fields.badge_text || null,
        sort_order: Number(fields.sort_order) || 0,
        image_url: fields.image_url || null,
        video_url: fields.video_url || null,
      })
      .eq('id', product.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
    onChanged?.();
  }

  // A location can opt out of the shared content and keep its own photo /
  // description -- for the genuine cases where one store plates a dish
  // differently. While opted out, that location stops receiving updates made
  // here; opting back in re-inherits on the next save.
  async function toggleOverride(item) {
    const next = !item.editorial_override;
    const { error: overrideError } = await supabase
      .from('menu_items')
      .update({ editorial_override: next })
      .eq('id', item.id);
    if (overrideError) {
      setError(overrideError.message);
      return;
    }
    if (!next) {
      // Re-inherit immediately so the row doesn't sit stale until the next edit.
      await supabase.rpc('sync_menu_items_from_product', { p_product_id: product.id });
    }
    onChanged?.();
  }

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    if (!files.length) return;

    setError('');
    const current = media || [];
    let nextSortOrder = current.length ? Math.max(...current.map((m) => m.sort_order)) + 1 : 0;
    const newRows = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Uploading ${i + 1} of ${files.length}…`);
      const ext = file.name.split('.').pop();
      const path = `product-${product.id}-${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('mimis-menu-images')
        .upload(path, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) {
        setError(uploadError.message);
        continue;
      }

      const { data: publicUrlData } = supabase.storage.from('mimis-menu-images').getPublicUrl(path);
      const media_type = file.type.startsWith('video/') ? 'video' : 'image';
      newRows.push({ product_id: product.id, media_type, url: publicUrlData.publicUrl, sort_order: nextSortOrder++ });
    }

    setUploadProgress('');
    if (!newRows.length) return;

    const { data: inserted, error: insertError } = await supabase
      .from('menu_item_media')
      .insert(newRows)
      .select('id, media_type, url, sort_order');

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const updated = [...current, ...inserted].sort((a, b) => a.sort_order - b.sort_order);
    setMedia(updated);
    const cover = deriveCover(updated);
    set('image_url', cover.image_url);
    set('video_url', cover.video_url);
  }

  function handleDropzoneDrop(e) {
    e.preventDefault();
    setDropActive(false);
    uploadFiles(e.dataTransfer.files);
  }

  async function handleDeleteMedia(mediaId) {
    const current = media || [];
    const { error: deleteError } = await supabase.from('menu_item_media').delete().eq('id', mediaId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    const updated = current.filter((m) => m.id !== mediaId);
    setMedia(updated);
    const cover = deriveCover(updated);
    set('image_url', cover.image_url);
    set('video_url', cover.video_url);
  }

  function handleThumbDragStart(index) {
    dragIndexRef.current = index;
  }

  async function handleThumbDrop(index) {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from === null || from === index) return;

    const current = [...(media || [])];
    const [moved] = current.splice(from, 1);
    current.splice(index, 0, moved);
    const reordered = current.map((m, i) => ({ ...m, sort_order: i }));
    setMedia(reordered);
    const cover = deriveCover(reordered);
    set('image_url', cover.image_url);
    set('video_url', cover.video_url);

    const { error: reorderError } = await supabase
      .from('menu_item_media')
      .upsert(reordered.map((m) => ({ id: m.id, product_id: product.id, media_type: m.media_type, url: m.url, sort_order: m.sort_order })));
    if (reorderError) setError(reorderError.message);
  }

  const sharedCount = items.filter((i) => !i.editorial_override).length;

  return (
    <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-4">
      <div className="flex gap-4">
        <button
          type="button"
          onClick={toggleExpanded}
          className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-black/30 group"
          aria-label="Manage media"
        >
          {fields.video_url ? (
            <video src={fields.video_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
          ) : fields.image_url ? (
            <Image src={fields.image_url} alt={product.name} fill className="object-cover" sizes="96px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-cream/25 text-[10px] text-center px-1">No photo</div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold uppercase tracking-wide text-cream transition-opacity">
              {expanded ? 'Close' : 'Manage'}
            </span>
          </div>
          {media?.length > 1 && (
            <span className="absolute bottom-1 right-1 text-[9px] bg-ink/80 text-gold rounded px-1">{media.length}</span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-serif font-semibold text-cream text-sm">{displayName(product.name)}</p>
              <p className="text-cream/40 text-[11px]">
                {sharedCount > 0
                  ? `One edit updates ${sharedCount} location${sharedCount === 1 ? '' : 's'}`
                  : 'Every location overrides this — edits here apply to none'}
              </p>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-cream/70 shrink-0">
              <input type="checkbox" checked={fields.featured} onChange={(e) => set('featured', e.target.checked)} />
              Featured
            </label>
          </div>

          {/* Per-location facts, straight from Clover. Read-only on purpose:
              anything typed here would be overwritten by the next hourly sync. */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {items.map((item) => (
              <span
                key={item.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] ${
                  item.available ? 'border-cream/15 text-cream/70' : 'border-brick/40 text-brick/80'
                }`}
                title={item.available ? 'Available at this location' : 'Marked unavailable in Clover'}
              >
                <span className="font-semibold">{item.location}</span>
                <span className="opacity-70">{formatPrice(item.price_cents)}</span>
                {!item.available && <span className="uppercase tracking-wide">off</span>}
                <button
                  type="button"
                  onClick={() => toggleOverride(item)}
                  className={`ml-0.5 rounded px-1 ${item.editorial_override ? 'bg-gold/80 text-ink font-bold' : 'text-cream/35 hover:text-cream/70'}`}
                  title={
                    item.editorial_override
                      ? 'This location uses its own photo/description. Click to go back to the shared one.'
                      : 'Uses the shared photo/description. Click to give this location its own.'
                  }
                >
                  {item.editorial_override ? 'own' : 'shared'}
                </button>
              </span>
            ))}
          </div>

          <textarea
            placeholder="Description shown on the storefront (optional)"
            value={fields.description}
            onChange={(e) => set('description', e.target.value)}
            className="input w-full mt-2 !text-xs"
            rows={2}
          />

          <div className="flex gap-2 mt-2">
            <input
              placeholder="Badge, e.g. HOT"
              value={fields.badge_text}
              onChange={(e) => set('badge_text', e.target.value)}
              className="input flex-1 !text-xs"
            />
            <input
              type="number"
              placeholder="Sort"
              value={fields.sort_order}
              onChange={(e) => set('sort_order', e.target.value)}
              className="input w-20 !text-xs"
            />
            <button onClick={handleSave} disabled={saving} className="btn-primary !px-4 !py-2 !text-[11px] disabled:opacity-50">
              {saving ? 'Saving…' : savedAt ? 'Saved ✓' : 'Save'}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            {error && <p className="text-brick text-xs">{error}</p>}
            <button
              type="button"
              onClick={toggleExpanded}
              className="text-gold/80 hover:text-gold text-[11px] font-bold uppercase tracking-wide ml-auto"
            >
              {expanded ? 'Hide media manager ▲' : `Manage media (${media?.length ?? '…'}) ▾`}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-cream/10">
          <div
            onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
            onDragLeave={() => setDropActive(false)}
            onDrop={handleDropzoneDrop}
            onClick={() => dropInputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed text-center py-6 px-4 cursor-pointer transition-colors ${
              dropActive ? 'border-gold bg-gold/10' : 'border-cream/20 hover:border-cream/35'
            }`}
          >
            <p className="text-cream/60 text-xs">
              {uploadProgress || 'Drag & drop photos or videos here, or click to browse'}
            </p>
            <p className="text-cream/30 text-[10px] mt-1">
              Multiple files supported &middot; first item becomes the cover &middot; shown at every location carrying this product
            </p>
            <input
              ref={dropInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => uploadFiles(e.target.files)}
            />
          </div>

          {media === null ? (
            <p className="text-cream/40 text-xs mt-3">Loading gallery…</p>
          ) : media.length === 0 ? (
            <p className="text-cream/40 text-xs mt-3">No gallery media yet -- add some above.</p>
          ) : (
            <div className="flex flex-wrap gap-3 mt-4">
              {media.map((m, i) => (
                <div
                  key={m.id}
                  draggable
                  onDragStart={() => handleThumbDragStart(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleThumbDrop(i)}
                  className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-cream/15 bg-black/30 cursor-grab active:cursor-grabbing group"
                  title="Drag to reorder"
                >
                  {m.media_type === 'video' ? (
                    <video src={m.url} muted className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <Image src={m.url} alt="" fill className="object-cover" sizes="80px" />
                  )}
                  <span className="absolute top-1 left-1 text-[8px] font-bold bg-ink/80 text-gold rounded px-1">
                    {m.media_type === 'video' ? 'VID' : 'IMG'}
                  </span>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-gold/90 text-ink rounded px-1">COVER</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteMedia(m.id); }}
                    aria-label="Remove media"
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink/80 text-cream text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
