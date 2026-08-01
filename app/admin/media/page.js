'use client';
import { useMemo, useRef, useState } from 'react';
import { useMediaLibrary, uploadMedia, deleteMedia } from '@/components/admin/MediaPicker';
import { isVideoFile } from '@/lib/embed';
import { GuidePanel } from '@/components/admin/Guide';

// Standalone media library. Same store the section media picker uses -- this
// screen exists so staff can upload and tidy up assets without being part-way
// through editing a page.
//
// The library merges four sources (mimis.all_media view): files uploaded here
// (deletable), plus menu-item photos, menu gallery media and news media (all
// managed on their own screens -- deleting them here would silently break the
// menu, so they're read-only and labelled).

const PAGE_SIZE = 24;

const KIND_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'image', label: 'Images' },
  { key: 'video', label: 'Videos' },
  { key: 'uploaded', label: 'My uploads' },
];

export default function AdminMediaPage() {
  const { items, loading, refresh } = useMediaLibrary();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const fileRef = useRef(null);

  // Filter + paginate client-side: the library is a few hundred rows of
  // metadata (the images themselves load lazily per page), so one fetch and
  // local slicing beats round-tripping to the database per page.
  const filtered = useMemo(() => {
    if (filter === 'uploaded') return items.filter((m) => m.deletable);
    if (filter === 'all') return items;
    return items.filter((m) => (m.kind || (isVideoFile(m.public_url) ? 'video' : 'image')) === filter);
  }, [items, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function setFilterAndReset(key) {
    setFilter(key);
    setPage(0);
  }

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

  async function handleDelete(item) {
    if (!item.deletable) {
      alert('This file belongs to a menu item or news post. Remove it from there instead.');
      return;
    }
    if (!confirm(`Delete "${item.filename}"? Any page still using it will show a broken image.`)) return;
    try {
      await deleteMedia(item);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(''), 1800);
    } catch { /* clipboard unavailable — the URL is visible below anyway */ }
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-serif font-bold text-3xl text-cream">Media</h1>
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-primary disabled:opacity-50">
          {busy ? 'Uploading…' : '+ Upload'}
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleFiles} />
      </div>
      <p className="text-cream/55 text-sm mb-5">
        Photos and videos for your website.
      </p>

      <GuidePanel title="How to use your media">
        <p>
          Upload a photo or video here once, then use it anywhere on the site. Nothing uploaded here
          appears publicly until you actually place it on a page.
        </p>
        <p>
          Press <strong>Copy URL</strong> on any item, then paste that link into a page in the theme
          editor. Pasted on its own line, a photo becomes a full-width image and a video becomes a
          player with controls — no code needed.
        </p>
        <p className="text-cream/55">
          Only files uploaded on this screen can be deleted here. Menu-item photos, gallery media and
          news images are managed on their own screens — they show a &ldquo;Menu&rdquo; or
          &ldquo;News&rdquo; tag instead of a Delete button so removing one can&rsquo;t silently
          break the menu.
        </p>
      </GuidePanel>
      {error && <p className="text-brick text-sm mb-4">{error}</p>}

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {KIND_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilterAndReset(f.key)}
            className={`text-xs font-bold uppercase tracking-wide px-3.5 py-2 rounded-full border transition ${
              filter === f.key
                ? 'bg-gold text-ink border-gold'
                : 'text-cream/60 border-cream/15 hover:border-gold/50 hover:text-gold'
            }`}
          >
            {f.label}
          </button>
        ))}
        {!loading && (
          <span className="text-cream/40 text-xs ml-auto">
            {filtered.length} file{filtered.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-cream/50 py-10 text-center">Loading…</p>
      ) : !filtered.length ? (
        <p className="text-cream/50 py-10 text-center">
          {filter === 'uploaded'
            ? 'Nothing uploaded yet — everything currently in the library comes from menu items and news posts. Press + Upload to add standalone files.'
            : 'Nothing here for this filter.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {pageItems.map((m) => (
              <div key={m.id} className="rounded-xl border border-cream/12 overflow-hidden bg-cream/[0.03]">
                {isVideoFile(m.public_url)
                  ? <video src={m.public_url} className="w-full h-28 object-cover" muted controls preload="metadata" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={m.public_url} alt={m.alt_text || ''} className="w-full h-28 object-cover" loading="lazy" />}
                <div className="p-2">
                  <p className="text-cream/70 text-xs truncate" title={m.filename}>{m.filename}</p>
                  <p className="text-cream/35 text-[10px] mb-1">{m.source}</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => copyUrl(m.public_url)} className="text-gold text-xs">
                      {copied === m.public_url ? 'Copied!' : 'Copy URL'}
                    </button>
                    {m.deletable
                      ? <button onClick={() => handleDelete(m)} className="text-cream/40 hover:text-brick text-xs">Delete</button>
                      : (
                        <span
                          className="text-cream/30 text-[10px] uppercase tracking-wide"
                          title="Managed on the menu item or news post — remove it there"
                        >
                          {m.source === 'News' ? 'News' : 'Menu'}
                        </span>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="btn-secondary !px-4 !py-2 text-xs disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-cream/50 text-xs">
                Page {safePage + 1} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
                className="btn-secondary !px-4 !py-2 text-xs disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
