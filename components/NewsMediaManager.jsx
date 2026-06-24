'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { getSupabasePublicClient } from '@/lib/supabaseClient';

// "Featured in the news" video/photo gallery manager for /admin/settings.
// Mirrors AdminItemEditor's upload/reorder/delete mechanics against
// mimis.news_media instead of menu_item_media -- multi-file dropzone, drag-to-
// reorder thumbnails (ref-based index, not native dataTransfer), per-item
// delete. Adds a caption field and an Active toggle (news_media has no parent
// item to key availability off of, so hiding a clip without deleting it needs
// its own flag).
export default function NewsMediaManager() {
  const supabase = getSupabasePublicClient();
  const dropInputRef = useRef(null);
  const dragIndexRef = useRef(null);

  const [media, setMedia] = useState(null); // null = not loaded yet
  const [dropActive, setDropActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadMedia();
  }, []);

  async function loadMedia() {
    const { data, error: loadError } = await supabase
      .from('news_media')
      .select('id, media_type, url, caption, active, sort_order')
      .order('sort_order', { ascending: true });
    if (loadError) {
      setError(loadError.message);
      setMedia([]);
    } else {
      setMedia(data || []);
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
      const path = `news/${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('mimis-menu-images')
        .upload(path, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) {
        setError(uploadError.message);
        continue;
      }

      const { data: publicUrlData } = supabase.storage.from('mimis-menu-images').getPublicUrl(path);
      const media_type = file.type.startsWith('video/') ? 'video' : 'image';
      newRows.push({ media_type, url: publicUrlData.publicUrl, caption: '', active: true, sort_order: nextSortOrder++ });
    }

    setUploadProgress('');
    if (!newRows.length) return;

    const { data: inserted, error: insertError } = await supabase
      .from('news_media')
      .insert(newRows)
      .select('id, media_type, url, caption, active, sort_order');

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMedia([...current, ...inserted].sort((a, b) => a.sort_order - b.sort_order));
  }

  function handleDropzoneDrop(e) {
    e.preventDefault();
    setDropActive(false);
    uploadFiles(e.dataTransfer.files);
  }

  async function handleDelete(mediaId) {
    const current = media || [];
    const { error: deleteError } = await supabase.from('news_media').delete().eq('id', mediaId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMedia(current.filter((m) => m.id !== mediaId));
  }

  async function handleToggleActive(item) {
    const current = media || [];
    const nextActive = !item.active;
    const { error: updateError } = await supabase
      .from('news_media')
      .update({ active: nextActive })
      .eq('id', item.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMedia(current.map((m) => (m.id === item.id ? { ...m, active: nextActive } : m)));
  }

  async function handleCaptionBlur(item, value) {
    if (value === (item.caption || '')) return;
    const current = media || [];
    const { error: updateError } = await supabase
      .from('news_media')
      .update({ caption: value || null })
      .eq('id', item.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMedia(current.map((m) => (m.id === item.id ? { ...m, caption: value } : m)));
  }

  // Reorder via native drag-and-drop among the rows (separate from the
  // OS-file-drop dropzone above) -- tracked with a plain ref since we're
  // reordering in-memory rows, not dropping files.
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

    const { error: reorderError } = await supabase.from('news_media').upsert(
      reordered.map((m) => ({
        id: m.id,
        media_type: m.media_type,
        url: m.url,
        caption: m.caption || null,
        active: m.active,
        sort_order: m.sort_order,
      }))
    );
    if (reorderError) setError(reorderError.message);
  }

  return (
    <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-5 mt-6">
      <h2 className="font-serif font-bold text-lg text-cream mb-1">Featured in the News</h2>
      <p className="text-cream/55 text-xs mb-4">
        Videos and photos shown in the &ldquo;As Seen In&rdquo; section on the homepage. Drag rows to reorder;
        uncheck Active to hide a clip without deleting it.
      </p>

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
          {uploadProgress || 'Drag & drop news videos or photos here, or click to browse'}
        </p>
        <p className="text-cream/30 text-[10px] mt-1">Multiple files supported</p>
        <input
          ref={dropInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => uploadFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-brick text-xs mt-3">{error}</p>}

      {media === null ? (
        <p className="text-cream/40 text-xs mt-4">Loading…</p>
      ) : media.length === 0 ? (
        <p className="text-cream/40 text-xs mt-4">No news media yet — add a video or photo above.</p>
      ) : (
        <div className="space-y-3 mt-4">
          {media.map((m, i) => (
            <div
              key={m.id}
              draggable
              onDragStart={() => handleThumbDragStart(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleThumbDrop(i)}
              className="flex items-center gap-3 rounded-xl border border-cream/10 bg-black/20 p-3 cursor-grab active:cursor-grabbing"
              title="Drag to reorder"
            >
              <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-black/30">
                {m.media_type === 'video' ? (
                  <video src={m.url} muted className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <Image src={m.url} alt="" fill className="object-cover" sizes="64px" />
                )}
                <span className="absolute top-0.5 left-0.5 text-[8px] font-bold bg-ink/80 text-gold rounded px-1">
                  {m.media_type === 'video' ? 'VID' : 'IMG'}
                </span>
              </div>

              <input
                placeholder="Caption, e.g. WXYZ Channel 4 — June 2026"
                defaultValue={m.caption || ''}
                onBlur={(e) => handleCaptionBlur(m, e.target.value)}
                className="input flex-1 !text-xs"
              />

              <label className="flex items-center gap-1.5 text-[11px] text-cream/70 shrink-0">
                <input type="checkbox" checked={m.active} onChange={() => handleToggleActive(m)} />
                Active
              </label>

              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                aria-label="Remove"
                className="text-cream/40 hover:text-brick text-xs shrink-0 px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
