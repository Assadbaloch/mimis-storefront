'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { importTheme } from '@/lib/themeImport';
import { GuidePanel, Steps } from '@/components/admin/Guide';
import DesignWizard from '@/components/admin/DesignWizard';

// Theme manager. Owner-only (enforced by RLS on mimis.themes).
//
// Import-only: the owner pastes one complete HTML file and the system splits
// it into layout + pages. The pasted file is the single source of truth for a
// theme — there is deliberately no manual page creation in the editor.

export default function ThemesPage() {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const router = useRouter();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data, error: err } = await getSupabasePublicClient()
      .from('themes').select('*').order('created_at', { ascending: false });
    if (err) setError(err.message);
    setThemes(data || []);
    setLoading(false);
  }

  const activeTheme = themes.find((t) => t.status === 'active') || null;

  // Analyse as they type so problems surface before anything is saved.
  function analyse(text) {
    setSource(text);
    setResult(text.trim() ? importTheme(text) : null);
  }

  // Reading the file in the browser keeps this simple: no upload endpoint, and
  // the HTML never leaves the page until the owner presses Import.
  async function readFile(file) {
    if (!file) return;
    const ok = /\.(html?|txt)$/i.test(file.name) || /text\/html|text\/plain/.test(file.type);
    if (!ok) { setError('Choose an .html file.'); return; }
    setError('');
    const text = await file.text();
    setFileName(file.name);
    if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, ''));
    analyse(text);
  }

  async function doImport() {
    if (!result?.ok) return;
    if (!name.trim()) { setError('Give the theme a name first.'); return; }
    setBusy(true); setError('');
    const supabase = getSupabasePublicClient();
    try {
      const { data: theme, error: tErr } = await supabase.from('themes').insert({
        name: name.trim(),
        status: 'draft',
        // The pasted file itself is the theme's source of truth from here on;
        // the fields below are derived from it and regenerated on every save.
        source_html: source,
        layout_html: result.layoutHtml,
        global_css: result.globalCss,
        head_snippet: result.headSnippet,
      }).select('id').single();
      if (tErr) throw tErr;

      const rows = result.pages.map((p, i) => ({
        theme_id: theme.id, slug: p.slug, title: p.title,
        html: p.html, status: 'draft', sort_order: i,
      }));
      const { error: pErr } = await supabase.from('theme_pages').insert(rows);
      if (pErr) throw pErr;

      router.push(`/admin/themes/${theme.id}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  async function setStatus(theme, next) {
    const supabase = getSupabasePublicClient();
    // Only one theme may be active, so stand the current one down first.
    if (next === 'active') {
      await supabase.from('themes').update({ status: 'draft' }).eq('status', 'active');
    }
    const { error: err } = await supabase.from('themes')
      .update({ status: next, updated_at: new Date().toISOString() }).eq('id', theme.id);
    if (err) setError(err.message);
    load();
  }

  async function revertToDefault() {
    if (!confirm('Switch back to the original Mimi’s design? Your theme is kept and can be made live again at any time.')) return;
    await getSupabasePublicClient().from('themes').update({ status: 'draft' }).eq('status', 'active');
    load();
  }

  async function duplicate(theme) {
    setBusy(true);
    const supabase = getSupabasePublicClient();
    const { data: copy } = await supabase.from('themes').insert({
      name: `${theme.name} (copy)`, description: theme.description, status: 'draft',
      layout_html: theme.layout_html, global_css: theme.global_css, head_snippet: theme.head_snippet,
    }).select('id').single();
    const { data: pages } = await supabase.from('theme_pages').select('*').eq('theme_id', theme.id);
    if (copy && pages?.length) {
      await supabase.from('theme_pages').insert(pages.map((p) => ({
        theme_id: copy.id, slug: p.slug, title: p.title, html: p.html, css: p.css, js: p.js,
        standalone: p.standalone, seo_title: p.seo_title, seo_description: p.seo_description,
        status: 'draft', sort_order: p.sort_order,
      })));
    }
    setBusy(false); load();
  }

  async function remove(theme) {
    if (theme.status === 'active') { alert('Make another design live before deleting this one.'); return; }
    if (!confirm(`Delete "${theme.name}" and all of its pages? This cannot be undone.`)) return;
    await getSupabasePublicClient().from('themes').delete().eq('id', theme.id);
    load();
  }

  async function preview(theme) {
    const { data: { session } } = await getSupabasePublicClient().auth.getSession();
    if (!session) { setError('Session expired — please sign in again.'); return; }
    window.open(`/api/theme-preview/${theme.id}?token=${session.access_token}`, '_blank');
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <h1 className="font-serif font-bold text-3xl text-cream mb-2">Themes</h1>
      <p className="text-cream/55 text-sm mb-5">
        A theme is the whole look of your website. One is live at a time, and switching is instant.
      </p>

      <GuidePanel title="How this works">
        <Steps items={[
          'Design a page however you like — or ask an AI, using the instructions on the Storefront Settings page.',
          'Paste the finished HTML file below. Your header, footer, styles and pages are pulled out automatically.',
          'Preview it. Only you can see a preview — customers still see the current site.',
          'Press Make live when you are happy. You can switch back at any time.',
        ]} />
        <p className="pt-1">
          Your menu, prices, cart and checkout keep working the same underneath, whichever design is live.
        </p>
      </GuidePanel>

      {error && <p className="text-brick text-sm mb-4">{error}</p>}

      {/* ---- design wizard: generates the AI prompt ---- */}
      {!showWizard ? (
        <div className="rounded-xl border border-cream/15 bg-cream/[0.03] p-4 mb-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-cream font-semibold text-sm">Don&rsquo;t have a design yet?</p>
            <p className="text-cream/50 text-xs mt-0.5">
              Answer a few questions and we&rsquo;ll write the instructions to give an AI.
            </p>
          </div>
          <button onClick={() => setShowWizard(true)} className="btn-primary text-sm shrink-0">
            Design with AI
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-cream/15 bg-cream/[0.03] p-4 mb-4">
          <div className="flex justify-end">
            <button onClick={() => setShowWizard(false)} className="text-cream/45 hover:text-cream text-sm">
              Close
            </button>
          </div>
          <DesignWizard />
        </div>
      )}

      {/* ---- import ---- */}
      {!showImport ? (
        <button onClick={() => setShowImport(true)} className="btn-primary mb-6">+ New Theme from HTML</button>
      ) : (
        <div className="rounded-xl border border-cream/15 bg-cream/[0.03] p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-cream font-semibold">New theme</h2>
            <button onClick={() => { setShowImport(false); setSource(''); setResult(null); setFileName(''); }}
              className="text-cream/45 hover:text-cream text-sm">Cancel</button>
          </div>

          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Theme name, e.g. Summer 2026" className="input w-full mb-3" />

          {/* Upload / drag-drop an .html file, or paste below. */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files?.[0]); }}
            className={`rounded-xl border border-dashed px-4 py-5 mb-3 text-center transition ${
              dragging ? 'border-gold bg-gold/[0.08]' : 'border-cream/25'
            }`}
          >
            <p className="text-cream/70 text-sm mb-2">
              {fileName ? <>Loaded <span className="text-gold">{fileName}</span></> : 'Drop your .html file here'}
            </p>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-primary text-sm">
              {fileName ? 'Choose a different file' : 'Choose HTML file'}
            </button>
            <input ref={fileRef} type="file" accept=".html,.htm,.txt,text/html" hidden
              onChange={(e) => readFile(e.target.files?.[0])} />
            <p className="text-cream/40 text-xs mt-2">or paste the code below</p>
          </div>

          <textarea value={source} onChange={(e) => analyse(e.target.value)} rows={12} spellCheck={false}
            placeholder={'Paste your complete HTML file here…\n\nFor a multi-page site, separate pages with:\n<!-- mimis:page slug="catering" title="Catering" -->'}
            className="w-full bg-ink border border-cream/15 rounded-lg p-3 text-cream font-mono text-xs leading-relaxed mb-3" />

          {result && (
            <div className="mb-3 space-y-2">
              {result.errors.map((e, i) => <p key={i} className="text-brick text-sm">✕ {e}</p>)}
              {result.warnings.map((w, i) => <p key={i} className="text-gold text-sm">! {w}</p>)}
              {result.ok && (
                <div className="text-cream/70 text-sm">
                  <p className="text-gold">✓ Ready to import</p>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    <li>Header &amp; footer detected → site layout</li>
                    <li>{Math.round((result.globalCss || '').length / 1024)}KB of styles → global CSS</li>
                    <li>
                      {result.pages.length} page{result.pages.length === 1 ? '' : 's'}:{' '}
                      {result.pages.map((p) => p.slug === '' ? 'Home (/)' : `/${p.slug}`).join(', ')}
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          <button onClick={doImport} disabled={!result?.ok || busy}
            className="btn-primary disabled:opacity-40">
            {busy ? 'Importing…' : 'Import Theme'}
          </button>
        </div>
      )}

      {/* ---- default (no theme) ---- */}
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 mb-2 ${!activeTheme ? 'border-gold/50 bg-gold/[0.07]' : 'border-cream/12 bg-cream/[0.03]'}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-cream font-semibold">Mimi&rsquo;s Original Design</span>
            {!activeTheme && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold font-bold uppercase">Live</span>}
          </div>
          <span className="text-cream/45 text-xs">The built-in design. Always available to switch back to.</span>
        </div>
        {activeTheme
          ? <button onClick={revertToDefault} className="text-xs text-gold hover:underline">Make live</button>
          : <span className="text-cream/35 text-xs">Currently showing</span>}
      </div>

      {/* ---- themes ---- */}
      {loading ? (
        <p className="text-cream/50 py-8 text-center">Loading…</p>
      ) : themes.map((t) => (
        <div key={t.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 mb-2 ${t.status === 'active' ? 'border-gold/50 bg-gold/[0.07]' : 'border-cream/12 bg-cream/[0.03]'}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-cream font-semibold truncate">{t.name}</span>
              <StatusBadge status={t.status} />
            </div>
            {t.description && <span className="text-cream/45 text-xs">{t.description}</span>}
          </div>

          <button onClick={() => preview(t)} className="text-xs text-cream/60 hover:text-cream">Preview</button>
          {t.status === 'active'
            ? <button onClick={() => setStatus(t, 'draft')} className="text-xs text-cream/60 hover:text-brick">Unpublish</button>
            : <button onClick={() => setStatus(t, 'active')} className="text-xs text-gold hover:underline">Make live</button>}
          <button onClick={() => duplicate(t)} disabled={busy} className="text-xs text-cream/50 hover:text-cream">Duplicate</button>
          <Link href={`/admin/themes/${t.id}`} className="btn-primary text-xs px-3 py-1.5">Edit</Link>
          <button onClick={() => remove(t)} className="text-cream/40 hover:text-brick text-sm" title="Delete">🗑</button>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: ['Live', 'bg-gold/20 text-gold'],
    draft: ['Draft', 'bg-cream/10 text-cream/50'],
    archived: ['Archived', 'bg-cream/5 text-cream/35'],
  };
  const [label, cls] = map[status] || map.draft;
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${cls}`}>{label}</span>;
}
