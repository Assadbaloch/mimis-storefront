'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { SECTION_TYPES, defaultConfigFor } from '@/lib/sectionTypes';
import SectionEditor from '@/components/admin/SectionEditor';

// Page builder. Sections are edited in local state and written on Save, rather
// than saving on every keystroke -- that keeps typing responsive and means an
// accidental edit can be abandoned by leaving without saving.

export default function PageBuilder() {
  const { id } = useParams();
  const router = useRouter();

  const [page, setPage] = useState(null);
  const [sections, setSections] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [dirty, setDirty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabasePublicClient();
    const { data: p } = await supabase.from('pages').select('*').eq('id', id).maybeSingle();
    if (!p) { router.replace('/admin/pages'); return; }
    const { data: s } = await supabase.from('page_sections').select('*')
      .eq('page_id', id).order('position');
    setPage(p);
    setSections(s || []);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  // Guard against losing unsaved work on tab close / refresh.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function updatePage(patch) { setPage((p) => ({ ...p, ...patch })); setDirty(true); }

  // The home page is a real page record under the reserved slug 'home', but it
  // behaves differently: its blocks slot into the built-in design rather than
  // making up the whole page, and its address is fixed. Declared here (not
  // further down) because save() closes over it.
  const isHome = page?.slug === 'home';

  function addSection(type) {
    setSections((prev) => [...prev, {
      id: `new-${crypto.randomUUID()}`,
      page_id: id, type, position: prev.length,
      config: defaultConfigFor(type), active: true, _isNew: true,
    }]);
    setAddOpen(false);
    setDirty(true);
  }

  function changeSection(idx, next) {
    setSections((prev) => prev.map((s, i) => (i === idx ? next : s)));
    setDirty(true);
  }

  function removeSection(idx) {
    setSections((prev) => {
      const target = prev[idx];
      if (target && !target._isNew) setRemovedIds((r) => [...r, target.id]);
      return prev.filter((_, i) => i !== idx);
    });
    setDirty(true);
  }

  function moveSection(idx, delta) {
    setSections((prev) => {
      const next = [...prev];
      const j = idx + delta;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
    setDirty(true);
  }

  async function save() {
    setSaving(true); setStatus('');
    const supabase = getSupabasePublicClient();
    try {
      const { error: pErr } = await supabase.from('pages').update({
        title: page.title, slug: page.slug, status: page.status,
        seo_title: page.seo_title, seo_description: page.seo_description,
        show_header: page.show_header, show_footer: page.show_footer,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (pErr) throw pErr;

      if (removedIds.length) {
        const { error } = await supabase.from('page_sections').delete().in('id', removedIds);
        if (error) throw error;
      }

      // Position is rewritten from array order on every save, so reordering can
      // never leave two sections claiming the same slot.
      for (const [i, s] of sections.entries()) {
        // `slot` is deliberately cleared: the home page is now composed of
        // blocks in explicit position order like any other page, so a leftover
        // slot value would be a second, conflicting idea of where a block goes.
        if (s._isNew) {
          const { error } = await supabase.from('page_sections').insert({
            page_id: id, type: s.type, position: i, config: s.config,
            active: s.active !== false, slot: null,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('page_sections').update({
            position: i, config: s.config, active: s.active !== false, slot: null,
            updated_at: new Date().toISOString(),
          }).eq('id', s.id);
          if (error) throw error;
        }
      }

      setRemovedIds([]);
      setDirty(false);
      setStatus('Saved');
      await load();
      setTimeout(() => setStatus(''), 2500);
    } catch (err) {
      setStatus(err.message?.includes('reserved')
        ? 'That web address is reserved by the site — pick another.'
        : `Could not save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-center text-cream/50 py-24">Loading page…</p>;

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/pages" className="text-cream/50 hover:text-cream text-sm">← Pages</Link>
        <div className="flex-1" />
        {status && <span className={`text-sm ${status === 'Saved' ? 'text-gold' : 'text-brick'}`}>{status}</span>}
        {page.status === 'published' && (
          <a href={isHome ? '/' : `/${page.slug}`} target="_blank" rel="noreferrer" className="text-cream/50 hover:text-cream text-sm">Preview ↗</a>
        )}
        <button onClick={save} disabled={saving || !dirty}
          className="btn-primary text-sm disabled:opacity-40">
          {saving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
        </button>
      </div>

      {/* Page settings */}
      <div className="rounded-xl border border-cream/12 bg-cream/[0.03] p-4 mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-cream/60 text-xs uppercase tracking-wide mb-1">Page title</label>
            <input className="input w-full" value={page.title || ''} onChange={(e) => updatePage({ title: e.target.value })} />
          </div>
          <div>
            <label className="block text-cream/60 text-xs uppercase tracking-wide mb-1">Web address</label>
            {isHome ? (
              // The home page lives at "/" and its slug is what wires it to the
              // built-in design -- editing it would orphan the blocks.
              <div className="flex items-center gap-2 h-[42px]">
                <span className="text-cream/70 text-sm font-mono">/</span>
                <span className="text-cream/40 text-xs">Home page — address can&rsquo;t be changed</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-cream/40 text-sm">/</span>
                <input className="input flex-1" value={page.slug || ''} onChange={(e) => updatePage({ slug: e.target.value })} />
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-cream/60 text-xs uppercase tracking-wide mb-1">Description for search engines</label>
          <textarea rows={2} className="input w-full" value={page.seo_description || ''}
            onChange={(e) => updatePage({ seo_description: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-5 pt-1">
          <label className="flex items-center gap-2 text-cream/75 text-sm cursor-pointer">
            <input type="checkbox" checked={page.show_header !== false} onChange={(e) => updatePage({ show_header: e.target.checked })} />
            Show site header
          </label>
          <label className="flex items-center gap-2 text-cream/75 text-sm cursor-pointer">
            <input type="checkbox" checked={page.show_footer !== false} onChange={(e) => updatePage({ show_footer: e.target.checked })} />
            Show site footer
          </label>
          <label className="flex items-center gap-2 text-cream/75 text-sm cursor-pointer">
            <input type="checkbox" checked={page.status === 'published'}
              onChange={(e) => updatePage({ status: e.target.checked ? 'published' : 'draft' })} />
            Published
          </label>
        </div>
      </div>

      {/* Sections */}
      <h2 className="text-cream/60 text-xs uppercase tracking-wide mb-2">Sections</h2>
      {isHome && (
        <p className="text-cream/45 text-xs mb-3 leading-relaxed">
          This is your whole home page, top to bottom. Reorder with the arrows, edit any block, or
          add new ones. To undo everything at once, untick <strong>Published</strong> above and the
          original built-in design comes back.
        </p>
      )}
      <div className="space-y-2 mb-4">
        {sections.map((s, i) => (
          <SectionEditor key={s.id} section={s}
            isFirst={i === 0} isLast={i === sections.length - 1}
            onChange={(next) => changeSection(i, next)}
            onRemove={() => removeSection(i)}
            onMove={(d) => moveSection(i, d)} />
        ))}
        {!sections.length && (
          <p className="text-cream/45 text-sm text-center py-8 border border-dashed border-cream/15 rounded-xl">
            No sections yet. Add your first block below.
          </p>
        )}
      </div>

      <div className="relative">
        <button onClick={() => setAddOpen((o) => !o)}
          className="w-full py-3 rounded-xl border border-dashed border-cream/25 text-cream/70 hover:text-cream hover:border-gold/50 text-sm">
          + Add Section
        </button>
        {addOpen && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-cream/15 bg-ink p-3">
            {SECTION_TYPES.map((t) => (
              <button key={t.type} onClick={() => addSection(t.type)}
                className="text-left px-3 py-2 rounded-lg hover:bg-cream/10">
                <span className="text-cream text-sm">{t.icon} {t.label}</span>
                <span className="block text-cream/45 text-xs">{t.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
