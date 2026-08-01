'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { isVideoFile } from '@/lib/embed';

// Shared media library: browse, upload, pick. Used by every section field of
// type `media` / `media_multi`, and standalone at /admin/media.
//
// Uploads go to the public `site-media` Supabase Storage bucket and are indexed
// in mimis.media_library so the picker can list them without a storage API call
// per render. Both the bucket write and the table insert are gated on the
// staff/owner RLS policies -- a signed-out visitor can read files but not add
// or delete them.

const BUCKET = 'site-media';

// Reads the all_media view rather than media_library alone. Item photos, the
// menu gallery and news images already existed in other tables -- showing only
// freshly uploaded files made the library look empty despite ~290 assets being
// available to reuse.
export function useMediaLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = getSupabasePublicClient();
    const { data } = await supabase
      .from('all_media').select('*').order('created_at', { ascending: false });
    setItems((data || []).map((m) => ({
      ...m,
      // Keep the shape the rest of the UI expects.
      public_url: m.url,
      filename: m.label,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

export async function uploadMedia(file) {
  const supabase = getSupabasePublicClient();
  const kind = file.type.startsWith('video') ? 'video' : 'image';

  // Prefix with a timestamp so re-uploading a file with the same name doesn't
  // silently overwrite the one already used on a live page.
  const safeName = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000', upsert: false, contentType: file.type,
  });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { data: row, error: insErr } = await supabase.from('media_library').insert({
    storage_path: path, public_url: publicUrl, kind,
    filename: file.name, mime_type: file.type, size_bytes: file.size,
  }).select('*').single();
  if (insErr) throw new Error(insErr.message);
  return row;
}

// Only files uploaded through this screen can be deleted here. Item photos and
// gallery images belong to menu items and news entries -- deleting them from a
// media browser would silently break those, so they are read-only and marked
// as such in the UI.
export async function deleteMedia(item) {
  if (!item.deletable) throw new Error('This file belongs to a menu item or news post. Remove it from there instead.');
  const supabase = getSupabasePublicClient();
  if (item.storage_path) await supabase.storage.from(BUCKET).remove([item.storage_path]);
  await supabase.from('media_library').delete().eq('id', item.id);
}

/** Modal picker. `multiple` returns an array of URLs, otherwise a single URL. */
export default function MediaPicker({ open, onClose, onSelect, multiple = false }) {
  const { items, loading, refresh } = useMediaLibrary();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [chosen, setChosen] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => { if (open) setChosen([]); }, [open]);
  if (!open) return null;

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true); setError('');
    try {
      for (const f of files) await uploadMedia(f);
      await refresh();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function toggle(url) {
    if (!multiple) { onSelect(url); onClose(); return; }
    setChosen((prev) => prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-ink border border-cream/15 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream/10">
          <h3 className="font-serif font-bold text-lg text-cream">Media Library</h3>
          <div className="flex items-center gap-3">
            <button onClick={() => fileRef.current?.click()} disabled={busy}
              className="btn-primary text-sm disabled:opacity-50">
              {busy ? 'Uploading…' : '+ Upload'}
            </button>
            <button onClick={onClose} className="text-cream/50 hover:text-cream text-sm">Close</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleFiles} />
        </div>

        {error && <p className="text-brick text-sm px-5 pt-3">{error}</p>}

        <div className="overflow-y-auto p-5 flex-1">
          {loading ? (
            <p className="text-cream/50 text-sm text-center py-10">Loading…</p>
          ) : !items.length ? (
            <p className="text-cream/50 text-sm text-center py-10">
              Nothing here yet. Upload an image or video to get started.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {items.map((m) => {
                const selected = chosen.includes(m.public_url);
                return (
                  <button key={m.id} type="button" onClick={() => toggle(m.public_url)}
                    className={`relative rounded-xl overflow-hidden border-2 text-left ${selected ? 'border-gold' : 'border-transparent hover:border-cream/25'}`}>
                    {isVideoFile(m.public_url)
                      ? <video src={m.public_url} className="w-full h-24 object-cover" muted />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={m.public_url} alt={m.alt_text || ''} className="w-full h-24 object-cover" />}
                    <span className="block text-[10px] text-cream/55 px-2 py-1 truncate">{m.filename}</span>
                    {selected && <span className="absolute top-1 right-1 bg-gold text-ink text-[10px] font-bold px-1.5 rounded">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {multiple && (
          <div className="px-5 py-4 border-t border-cream/10 flex justify-between items-center">
            <span className="text-cream/55 text-sm">{chosen.length} selected</span>
            <button onClick={() => { onSelect(chosen); onClose(); }} className="btn-primary text-sm">
              Add selected
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
