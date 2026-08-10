'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { GuidePanel } from '@/components/admin/Guide';
import { importTheme, composeThemeSource } from '@/lib/themeImport';

// Theme editor: ONE document.
//
// A theme is edited as the same single HTML file it was imported from --
// header, styles, pages (separated by <!-- mimis:page --> markers) and footer
// together, exactly as a designer would hand it over. The old layout / CSS /
// head / pages tabs edited four derived fragments separately, which meant the
// original file could never be recovered and, worse, edits bypassed the import
// validation entirely.
//
// Saving runs the document back through the SAME importer that validates fresh
// imports. The hard requirements -- live menu tags, an ordering path, the
// --mimis-* style tokens -- therefore hold on every save, not just the first
// import: the safety net cannot be edited away afterwards.
//
// Themes imported before source_html existed are reconstructed from their
// fragments on first open (composeThemeSource) and become single-file from
// their next save.

export default function ThemeEditor() {
  const { id } = useParams();
  const router = useRouter();
  const [theme, setTheme] = useState(null);
  const [sourceText, setSourceText] = useState('');
  const [saveErrors, setSaveErrors] = useState([]);
  const [saveWarnings, setSaveWarnings] = useState([]);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabasePublicClient();
    const { data: t } = await supabase.from('themes').select('*').eq('id', id).maybeSingle();
    if (!t) { router.replace('/admin/themes'); return; }
    const { data: p } = await supabase.from('theme_pages').select('*').eq('theme_id', id).order('sort_order');
    setTheme(t);
    setSourceText(t.source_html || composeThemeSource(t, p || []));
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  async function save() {
    setStatus('');
    setSaveErrors([]);
    setSaveWarnings([]);

    // Same pipeline as a fresh import: reject the save outright if the
    // document fails the hard requirements.
    const result = importTheme(sourceText);
    setSaveWarnings(result.warnings || []);
    if (!result.ok) {
      setSaveErrors(result.errors);
      return;
    }

    setSaving(true);
    const supabase = getSupabasePublicClient();
    try {
      const { error: tErr } = await supabase.from('themes').update({
        name: theme.name,
        description: theme.description,
        source_html: sourceText,
        layout_html: result.layoutHtml,
        global_css: result.globalCss,
        head_snippet: result.headSnippet,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (tErr) throw tErr;

      // Pages are replaced wholesale from the document -- but each page's
      // published status is carried over BY SLUG. Without this, saving an
      // ACTIVE theme would reset its pages to draft and take the live home
      // page down mid-edit. Pages new to the document default to published:
      // in a single-file model, writing a page into the file IS the intent to
      // have it exist.
      const { data: existing } = await supabase
        .from('theme_pages').select('slug, status').eq('theme_id', id);
      const statusBySlug = new Map((existing || []).map((p) => [p.slug, p.status]));

      const { error: delErr } = await supabase.from('theme_pages').delete().eq('theme_id', id);
      if (delErr) throw delErr;

      const rows = result.pages.map((p, i) => ({
        theme_id: id,
        slug: p.slug,
        title: p.title,
        html: p.html,
        status: statusBySlug.get(p.slug) || 'published',
        sort_order: i,
      }));
      const { error: pErr } = await supabase.from('theme_pages').insert(rows);
      if (pErr) throw pErr;

      setDirty(false);
      setStatus('Saved');
      setTimeout(() => setStatus(''), 2500);
    } catch (e) {
      setSaveErrors([`Could not save: ${e.message}`]);
    } finally {
      setSaving(false);
    }
  }

  if (!theme) return <p className="text-center text-cream/50 py-24">Loading theme…</p>;

  const pageCount = (sourceText.match(/<!--\s*mimis:page\b/gi) || []).length + 1;

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/admin/themes" className="text-cream/50 hover:text-cream text-sm">← Themes</Link>
        <div className="flex-1" />
        {status && <span className="text-sm text-gold">{status}</span>}
        <button onClick={save} disabled={!dirty || saving} className="btn-primary text-sm disabled:opacity-40">
          {saving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
        </button>
      </div>

      <input value={theme.name} onChange={(e) => { setTheme((t) => ({ ...t, name: e.target.value })); setDirty(true); }}
        className="input w-full mb-4 font-serif text-xl" />

      <GuidePanel title="How this editor works" defaultOpen={false}>
        <p>
          This is the whole theme as one HTML file — the same file that was imported. Header and
          footer are shared across pages; everything between them is the home page; additional pages
          start with a <code>&lt;!-- mimis:page slug=&quot;…&quot; title=&quot;…&quot; --&gt;</code> marker.
        </p>
        <p>
          Saving re-checks the document. It must contain a live menu tag
          (<code>&lt;mimis-menu&gt;</code>), a way to order (add-to-cart buttons or a link
          to <code>/menu</code>), and the <code>--mimis-*</code> style variables that the menu, cart
          and checkout pages take their look from. A file missing any of these won&rsquo;t save —
          that&rsquo;s deliberate, so a broken or static design can&rsquo;t go live.
        </p>
      </GuidePanel>

      {saveErrors.length > 0 && (
        <div className="rounded-xl border border-brick/40 bg-brick/10 p-4 mb-4">
          <p className="text-cream font-semibold text-sm mb-1">Not saved — fix these first:</p>
          <ul className="list-disc pl-5 space-y-1">
            {saveErrors.map((e, i) => <li key={i} className="text-cream/80 text-sm">{e}</li>)}
          </ul>
        </div>
      )}
      {saveWarnings.length > 0 && (
        <div className="rounded-xl border border-gold/30 bg-gold/[0.07] p-4 mb-4">
          <p className="text-cream font-semibold text-sm mb-1">Worth a look (saved anyway):</p>
          <ul className="list-disc pl-5 space-y-1">
            {saveWarnings.map((w, i) => <li key={i} className="text-cream/75 text-sm">{w}</li>)}
          </ul>
        </div>
      )}

      <p className="text-cream/45 text-xs mb-2">
        {pageCount === 1 ? 'Single page site' : `${pageCount} pages`} · edited as one document
      </p>

      <textarea
        value={sourceText}
        onChange={(e) => { setSourceText(e.target.value); setDirty(true); }}
        rows={34}
        spellCheck={false}
        className="w-full bg-ink border border-cream/15 rounded-lg p-3 text-cream font-mono text-xs leading-relaxed"
      />
    </div>
  );
}
