'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getSupabasePublicClient } from '@/lib/supabaseClient';

// Editor for a single theme page: HTML, page-scoped CSS, and optional JS.

export default function ThemePageEditor() {
  const { id, pageId } = useParams();
  const router = useRouter();
  const [page, setPage] = useState(null);
  const [tab, setTab] = useState('html');
  const [status, setStatus] = useState('');
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getSupabasePublicClient()
      .from('theme_pages').select('*').eq('id', pageId).maybeSingle();
    if (!data) { router.replace(`/admin/themes/${id}`); return; }
    setPage(data);
  }, [id, pageId, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  function edit(patch) { setPage((p) => ({ ...p, ...patch })); setDirty(true); }

  async function save() {
    setStatus('');
    const { error } = await getSupabasePublicClient().from('theme_pages').update({
      title: page.title, slug: page.slug, html: page.html, css: page.css, js: page.js,
      standalone: page.standalone, status: page.status,
      seo_title: page.seo_title, seo_description: page.seo_description,
      updated_at: new Date().toISOString(),
    }).eq('id', pageId);
    setStatus(error
      ? (error.message.includes('reserved') ? 'That address is reserved by the site.' : `Could not save: ${error.message}`)
      : 'Saved');
    if (!error) setDirty(false);
    setTimeout(() => setStatus(''), 2500);
  }

  async function remove() {
    if (!confirm(`Delete "${page.title}"?`)) return;
    await getSupabasePublicClient().from('theme_pages').delete().eq('id', pageId);
    router.replace(`/admin/themes/${id}`);
  }

  if (!page) return <p className="text-center text-cream/50 py-24">Loading page…</p>;

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <div className="flex items-center gap-3 mb-5">
        <Link href={`/admin/themes/${id}`} className="text-cream/50 hover:text-cream text-sm">← Theme</Link>
        <div className="flex-1" />
        {status && <span className={`text-sm ${status === 'Saved' ? 'text-gold' : 'text-brick'}`}>{status}</span>}
        {page.status === 'published' && (
          <a href={`/${page.slug}`} target="_blank" rel="noreferrer" className="text-cream/50 hover:text-cream text-sm">View ↗</a>
        )}
        <button onClick={save} disabled={!dirty} className="btn-primary text-sm disabled:opacity-40">
          {dirty ? 'Save Changes' : 'Saved'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-cream/60 text-xs uppercase tracking-wide mb-1">Title</label>
          <input className="input w-full" value={page.title || ''} onChange={(e) => edit({ title: e.target.value })} />
        </div>
        <div>
          <label className="block text-cream/60 text-xs uppercase tracking-wide mb-1">Web address</label>
          <div className="flex items-center gap-1">
            <span className="text-cream/40 text-sm">/</span>
            <input className="input flex-1" value={page.slug || ''} onChange={(e) => edit({ slug: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-5 mb-4">
        <label className="flex items-center gap-2 text-cream/75 text-sm cursor-pointer">
          <input type="checkbox" checked={page.status === 'published'}
            onChange={(e) => edit({ status: e.target.checked ? 'published' : 'draft' })} />
          Published
        </label>
        <label className="flex items-center gap-2 text-cream/75 text-sm cursor-pointer">
          <input type="checkbox" checked={!!page.standalone}
            onChange={(e) => edit({ standalone: e.target.checked })} />
          Standalone (hide site header &amp; footer)
        </label>
      </div>

      <div className="flex gap-4 border-b border-cream/10 mb-3">
        {['html', 'css', 'js'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 text-xs uppercase tracking-wide font-bold ${tab === t ? 'text-gold border-b-2 border-gold' : 'text-cream/50 hover:text-cream'}`}>
            {t}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={remove} className="text-cream/40 hover:text-brick text-xs pb-2">Delete page</button>
      </div>

      {tab === 'html' && (
        <>
          <textarea value={page.html || ''} rows={24} spellCheck={false}
            onChange={(e) => edit({ html: e.target.value })}
            className="w-full bg-ink border border-cream/15 rounded-lg p-3 text-cream font-mono text-xs leading-relaxed" />
          <p className="text-cream/40 text-[11px] mt-2">
            Live data goes in with tags like <code>&lt;mimis-menu category=&quot;Burgers&quot;&gt;&lt;/mimis-menu&gt;</code>.
            See Storefront Settings for the full list you can hand to an AI.
          </p>
        </>
      )}
      {tab === 'css' && (
        <textarea value={page.css || ''} rows={20} spellCheck={false}
          onChange={(e) => edit({ css: e.target.value })}
          className="w-full bg-ink border border-cream/15 rounded-lg p-3 text-cream font-mono text-xs leading-relaxed" />
      )}
      {tab === 'js' && (
        <textarea value={page.js || ''} rows={16} spellCheck={false}
          onChange={(e) => edit({ js: e.target.value })}
          className="w-full bg-ink border border-cream/15 rounded-lg p-3 text-cream font-mono text-xs leading-relaxed" />
      )}
    </div>
  );
}
