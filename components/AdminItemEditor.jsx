'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { formatPrice, displayName } from '@/lib/format';

// Picks the cover image/video that the storefront grid reads directly off
// menu_items (image_url/video_url) -- first image and first video in gallery
// order. Lets the fast denormalized grid path keep working untouched while
// the full ordered gallery lives in mimis.menu_item_media.
function deriveCover(mediaList) {
  const image = mediaList.find((m) => m.media_type === 'image');
  const video = mediaList.find((m) => m.media_type === 'video');
  return { image_url: image?.url || '', video_url: video?.url || '' };
}

export default function AdminItemEditor({ item }) {
  const supabase = getSupabasePublicClient();
  const dropInputRef = useRef(null);
  const dragIndexRef = useRef(null);

  const [fields, setFields] = useState({
    description_override: item.description_override || '',
    featured: item.featured,
    badge_text: item.badge_text || '',
    sort_order: item.sort_order ?? 0,
    image_url: item.image_url || '',
    video_url: item.video_url || '',
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
      .eq('item_id', item.id)
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
      .from('menu_items')
      .update({
        description_override: fields.description_override || null,
        featured: fields.featured,
        badge_text: fields.badge_text || null,
        sort_order: Number(fields.sort_order) || 0,
        image_url: fields.image_url || null,
        video_url: fields.video_url || null,
      })
      .eq('id', item.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2000);
    }
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
      const path = `${item.clover_item_id}-${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('mimis-menu-images')
        .upload(path, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) {
        setError(uploadError.message);
        continue;
      }

      const { data: publicUrlData } = supabase.storage.from('mimis-menu-images').getPublicUrl(path);
      const media_type = file.type.startsWith('video/') ? 'video' : 'image';
      newRows.push({ item_id: item.id, media_type, url: publicUrlData.publicUrl, sort_order: nextSortOrder++ });
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

  // Reorder via native drag-and-drop among the gallery thumbnails (separate
  // from the OS-file-drop dropzone above -- tracked with a plain ref instead
  // of dataTransfer since we're reordering in-memory rows, not dropping files).
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
      .upsert(reordered.map((m) => ({ id: m.id, item_id: item.id, media_type: m.media_type, url: m.url, sort_order: m.sort_order })));
    if (reorderError) setError(reorderError.message);
  }

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
            <Image src={fields.image_url} alt={item.name} fill className="object-cover" sizes="96px" />
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
            <div>
              <p className="font-serif font-semibold text-cream text-sm">{displayName(item.name)}</p>
              <p className="text-cream/40 text-xs">{formatPrice(item.price_cents)} &middot; price/name set by Clover</p>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-cream/70 shrink-0">
              <input type="checkbox" checked={fields.featured} onChange={(e) => set('featured', e.target.checked)} />
              Featured
            </label>
          </div>

          <textarea
            placeholder="Custom description for the storefront (optional)"
            value={fields.description_override}
            onChange={(e) => set('description_override', e.target.value)}
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
            <p className="text-cream/30 text-[10px] mt-1">Multiple files supported &middot; first item becomes the cover</p>
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
