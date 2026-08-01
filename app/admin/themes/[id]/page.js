'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { GuidePanel, THEME_TAB_HELP } from '@/components/admin/Guide';

// Theme editor: the layout shell, plus the theme's pages.
// Deliberately a code editor rather than a visual builder — the whole point of
// this system is that a complete design is pasted in as-is. Pages are created
// only by importing an HTML file (mimis:page markers); they can be edited and
// published here, but never created by hand.

export default function ThemeEditor() {
  const { id } = useParams();
  const router = useRouter();
  const [theme, setTheme] = useState(null);
  const [pages, setPages] = useState([]);
  const [tab, setTab] = useState('layout');
  const [status, setStatus] = useState('');
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabasePublicClient();
    const { data: t } = await supabase.from('themes').select('*').eq('id', id).maybeSingle();
    if (!t) { router.replace('/admin/themes'); return; }
    const { data: p } = await supabase.from('theme_pages').select('*').eq('theme_id', id).order('sort_order');
    setTheme(t); setPages(p || []);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  function edit(patch) { setTheme((t) => ({ ...t, ...patch })); setDirty(true); }

  const missingOutlet = theme && theme.layout_html && !/data-mimis-outlet/.test(theme.layout_html);
  const inlinedLogo = theme && /<img[^>]+(logo|brand)[^>]*>/i.test(theme.layout_html || '');

  async function save() {
    setStatus('');
    const { error } = await getSupabasePublicClient().from('themes').update({
      name: theme.name, description: theme.description,
      layout_html: theme.layout_html, global_css: theme.global_css,
      head_snippet: theme.head_snippet, updated_at: new Date().toISOString(),
    }).eq('id', id);
    setStatus(error ? `Could not save: ${error.message}` : 'Saved');
    if (!error) setDirty(false);
    setTimeout(() => setStatus(''), 2500);
  }

  if (!theme) return <p className="text-center text-cream/50 py-24">Loading theme…</p>;

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/admin/themes" className="text-cream/50 hover:text-cream text-sm">← Themes</Link>
        <div className="flex-1" />
        {status && <span className={`text-sm ${status === 'Saved' ? 'text-gold' : 'text-brick'}`}>{status}</span>}
        <button onClick={save} disabled={!dirty} className="btn-primary text-sm disabled:opacity-40">
          {dirty ? 'Save Changes' : 'Saved'}
        </button>
      </div>

      <input value={theme.name} onChange={(e) => edit({ name: e.target.value })}
        className="input w-full mb-4 font-serif text-xl" />

      <div className="flex gap-4 border-b border-cream/10 mb-4">
        {['layout', 'css', 'head', 'pages'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 text-xs uppercase tracking-wide font-bold ${tab === t ? 'text-gold border-b-2 border-gold' : 'text-cream/50 hover:text-cream'}`}>
            {t === 'head' ? 'Head' : t === 'css' ? 'Global CSS' : t}
          </button>
        ))}
      </div>

      <GuidePanel title={THEME_TAB_HELP[tab].title} defaultOpen={false}>
        {THEME_TAB_HELP[tab].body}
      </GuidePanel>

      {tab === 'layout' && (
        <div>
          {missingOutlet && (
            <p className="text-brick text-sm mb-2">
              This layout has no <code>&lt;div data-mimis-outlet&gt;&lt;/div&gt;</code>. Pages have nowhere to render,
              so the site will fall back to the default design until it&rsquo;s added.
            </p>
          )}
          {inlinedLogo && (
            <p className="text-gold text-sm mb-2">
              Looks like an image is being used as the logo. Use <code>&lt;mimis-logo&gt;&lt;/mimis-logo&gt;</code> instead
              so it always matches the uploaded brand logo.
            </p>
          )}
          <CodeArea value={theme.layout_html || ''} onChange={(v) => edit({ layout_html: v })} rows={26} />
        </div>
      )}

      {tab === 'css' && <CodeArea value={theme.global_css || ''} onChange={(v) => edit({ global_css: v })} rows={20} />}
      {tab === 'head' && <CodeArea value={theme.head_snippet || ''} onChange={(v) => edit({ head_snippet: v })} rows={12} />}

      {tab === 'pages' && (
        <div>
          {/* Pages come exclusively from the imported HTML file (split on
              <!-- mimis:page --> markers). No manual page creation here — a
              hand-added page would drift from the single-file source of truth.
              To add a page: regenerate the HTML with the page included (the
              Design-with-AI prompt covers this) and re-import the theme. */}
          {!pages.length ? (
            <p className="text-cream/50 text-sm py-6 text-center">
              No pages in this theme. Pages come from the imported HTML file — re-import with
              <code className="text-gold"> &lt;!-- mimis:page --&gt;</code> markers to add more.
            </p>
          ) : (
            <div className="space-y-2">
              {pages.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-cream/12 bg-cream/[0.03] px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-cream text-sm font-semibold">{p.title}</span>
                    <span className="block text-cream/45 text-xs">/{p.slug} · {p.status}</span>
                  </div>
                  <Link href={`/admin/themes/${id}/pages/${p.id}`} className="btn-primary text-xs px-3 py-1.5">Edit</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CodeArea({ value, onChange, rows }) {
  return (
    <textarea value={value} rows={rows} spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-ink border border-cream/15 rounded-lg p-3 text-cream font-mono text-xs leading-relaxed" />
  );
}
