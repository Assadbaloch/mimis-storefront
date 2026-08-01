'use client';
import { useEffect, useMemo, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { buildSchemaDoc, PROMPT_MODES } from '@/lib/embedSchema';

// The copy-paste block that goes into an AI prompt alongside a design brief.
//
// Real category names and locations are injected, so the AI is told what
// actually exists rather than guessing — that's what stops it inventing a
// category like "Wings" that isn't in the menu.

export default function SchemaDoc() {
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [mode, setMode] = useState('single');
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabasePublicClient();
    Promise.all([
      supabase.from('menu_items').select('category').eq('available', true),
      supabase.from('store_locations').select('location'),
    ]).then(([{ data: items }, { data: locs }]) => {
      setCategories(Array.from(new Set((items || []).map((i) => (i.category || '').trim()).filter(Boolean))).sort());
      setLocations((locs || []).map((l) => l.location));
    });
  }, []);

  const doc = useMemo(
    () => buildSchemaDoc({ categories, locations, mode }),
    [categories, locations, mode]
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(doc);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked; the text is selectable below */ }
  }

  return (
    <section className="mt-10">
      <h2 className="font-serif font-bold text-xl text-cream mb-2">Design a new look with AI</h2>
      <p className="text-cream/55 text-sm mb-4">
        Copy these instructions, paste them into any AI along with how you want the site to look,
        and it will produce a file with your real menu, prices, logo and ordering already built in.
        Then paste that file into <span className="text-cream/80">Themes → New Theme from HTML</span>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {PROMPT_MODES.map((m) => (
          <button key={m.key} type="button" onClick={() => setMode(m.key)}
            className={`text-left rounded-xl border px-4 py-3 transition ${
              mode === m.key ? 'border-gold bg-gold/[0.08]' : 'border-cream/15 hover:border-cream/30'
            }`}>
            <span className="block text-cream text-sm font-semibold">{m.label}</span>
            <span className="block text-cream/50 text-xs mt-0.5">{m.blurb}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={copy} disabled={!doc} className="btn-primary text-sm disabled:opacity-50">
          {copied ? 'Copied ✓' : 'Copy instructions'}
        </button>
        <button onClick={() => setOpen((o) => !o)} className="text-gold text-xs">
          {open ? 'Hide' : 'Preview'} what gets copied
        </button>
      </div>

      {open && (
        <pre className="mt-3 bg-ink border border-cream/15 rounded-lg p-3 text-cream/70 text-[11px] leading-relaxed overflow-auto max-h-96 whitespace-pre-wrap">
          {doc}
        </pre>
      )}
    </section>
  );
}
