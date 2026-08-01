'use client';
import { useEffect, useMemo, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import {
  buildDesignPrompt, VIBES, TYPE_STYLES, CORNERS, MOTION, SECTIONS, EXTRA_PAGES,
} from '@/lib/designPrompt';
import { PROMPT_MODES } from '@/lib/embedSchema';

// Guided prompt builder.
//
// The owner answers questions about how they want the site to LOOK. Everything
// functional -- the live menu tags, logo slot, layout outlet, output format --
// is generated automatically and marked as fixed, so an AI restyling the site
// can't quietly remove the ordering.

export default function DesignWizard() {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const [cfg, setCfg] = useState({
    mode: 'single',
    vibe: 'bold',
    typeStyle: 'display',
    corners: 'soft',
    motion: 'lively',
    useBrandColours: true,
    customColours: '',
    sections: ['hero_video', 'featured', 'video_band', 'locations', 'catering'],
    extraPages: [],
    reference: '',
    notes: '',
  });

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

  const prompt = useMemo(
    () => buildDesignPrompt({ ...cfg, categories, locations }),
    [cfg, categories, locations]
  );

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const toggle = (key, value) => setCfg((c) => ({
    ...c,
    [key]: c[key].includes(value) ? c[key].filter((v) => v !== value) : [...c[key], value],
  }));

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { setShowPrompt(true); }
  }

  return (
    <section className="mt-10">
      <h2 className="font-serif font-bold text-xl text-cream mb-1">Design a new look</h2>
      <p className="text-cream/55 text-sm mb-5">
        Answer a few questions about the style you want. We&rsquo;ll write the full instructions —
        including all the technical bits that keep your menu and ordering working — for you to give to any AI.
      </p>

      {/* progress */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <button onClick={() => setStep(n)}
              className={`w-7 h-7 rounded-full text-xs font-bold grid place-items-center shrink-0 ${
                step >= n ? 'bg-gold text-ink' : 'bg-cream/10 text-cream/40'
              }`}>{n}</button>
            <span className={`text-xs ${step === n ? 'text-cream' : 'text-cream/40'}`}>
              {n === 1 ? 'Structure' : n === 2 ? 'Style' : 'Get your prompt'}
            </span>
            {n < 3 && <div className="h-px flex-1 bg-cream/10" />}
          </div>
        ))}
      </div>

      {/* ---------------- step 1 ---------------- */}
      {step === 1 && (
        <div className="space-y-6">
          <Group label="How many pages?">
            <div className="grid sm:grid-cols-2 gap-2">
              {PROMPT_MODES.map((m) => (
                <Choice key={m.key} active={cfg.mode === m.key} onClick={() => set({ mode: m.key })}
                  title={m.label} hint={m.blurb} />
              ))}
            </div>
          </Group>

          {cfg.mode === 'multi' && (
            <Group label="Which extra pages?" hint="Home is always included.">
              <div className="grid sm:grid-cols-2 gap-2">
                {EXTRA_PAGES.map((p) => (
                  <Choice key={p.key} active={cfg.extraPages.includes(p.key)}
                    onClick={() => toggle('extraPages', p.key)} title={p.label} />
                ))}
              </div>
            </Group>
          )}

          <Group label="What should the home page include?" hint="Pick the blocks you want, roughly in order.">
            <div className="grid sm:grid-cols-2 gap-2">
              {SECTIONS.map((s) => (
                <Choice key={s.key} active={cfg.sections.includes(s.key)}
                  onClick={() => toggle('sections', s.key)} title={s.label} />
              ))}
            </div>
          </Group>

          <Nav onNext={() => setStep(2)} />
        </div>
      )}

      {/* ---------------- step 2 ---------------- */}
      {step === 2 && (
        <div className="space-y-6">
          <Group label="Overall feel">
            <div className="grid sm:grid-cols-2 gap-2">
              {VIBES.map((v) => (
                <Choice key={v.key} active={cfg.vibe === v.key} onClick={() => set({ vibe: v.key })}
                  title={v.label} hint={v.hint} />
              ))}
            </div>
          </Group>

          <Group label="Headline style">
            <div className="grid sm:grid-cols-2 gap-2">
              {TYPE_STYLES.map((t) => (
                <Choice key={t.key} active={cfg.typeStyle === t.key} onClick={() => set({ typeStyle: t.key })}
                  title={t.label} hint={t.hint} />
              ))}
            </div>
          </Group>

          <div className="grid sm:grid-cols-2 gap-6">
            <Group label="Corners">
              <div className="space-y-2">
                {CORNERS.map((c) => (
                  <Choice key={c.key} active={cfg.corners === c.key} onClick={() => set({ corners: c.key })} title={c.label} />
                ))}
              </div>
            </Group>
            <Group label="Animation">
              <div className="space-y-2">
                {MOTION.map((m) => (
                  <Choice key={m.key} active={cfg.motion === m.key} onClick={() => set({ motion: m.key })}
                    title={m.label} hint={m.hint} />
                ))}
              </div>
            </Group>
          </div>

          <Group label="Colours">
            <div className="grid sm:grid-cols-2 gap-2 mb-2">
              <Choice active={cfg.useBrandColours} onClick={() => set({ useBrandColours: true })}
                title="Use Mimi's brand colours" hint="Blue, red, yellow, white" />
              <Choice active={!cfg.useBrandColours} onClick={() => set({ useBrandColours: false })}
                title="Something different" hint="Describe your own palette" />
            </div>
            {!cfg.useBrandColours && (
              <textarea rows={3} value={cfg.customColours} onChange={(e) => set({ customColours: e.target.value })}
                placeholder="e.g. Charcoal background, cream text, warm orange buttons"
                className="input w-full text-sm" />
            )}
          </Group>

          <Group label="Anything you like the look of?" hint="A website you admire, or a description. Optional.">
            <textarea rows={2} value={cfg.reference} onChange={(e) => set({ reference: e.target.value })}
              placeholder="e.g. Clean like Sweetgreen, but bolder headlines"
              className="input w-full text-sm" />
          </Group>

          <Group label="Anything else?" hint="Optional.">
            <textarea rows={2} value={cfg.notes} onChange={(e) => set({ notes: e.target.value })}
              placeholder="e.g. Make the halal badge prominent. Keep it easy to read for older customers."
              className="input w-full text-sm" />
          </Group>

          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </div>
      )}

      {/* ---------------- step 3 ---------------- */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gold/25 bg-gold/[0.06] p-4">
            <p className="text-cream font-semibold text-sm mb-2">Your instructions are ready</p>
            <ol className="space-y-1.5 text-cream/70 text-sm list-decimal list-inside">
              <li>Copy the instructions below.</li>
              <li>Paste them into ChatGPT, Claude, or any AI you like.</li>
              <li>It will give you back an HTML file.</li>
              <li>Save it, then go to <span className="text-cream">Themes → New Theme from HTML</span> and upload it.</li>
              <li>Preview it, and make it live when you&rsquo;re happy.</li>
            </ol>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={copy} className="btn-primary">
              {copied ? 'Copied ✓' : 'Copy instructions'}
            </button>
            <button onClick={() => setShowPrompt((s) => !s)} className="text-gold text-sm">
              {showPrompt ? 'Hide' : 'Show'} instructions
            </button>
            <div className="flex-1" />
            <button onClick={() => setStep(2)} className="text-cream/50 hover:text-cream text-sm">← Change style</button>
          </div>

          {showPrompt && (
            <pre className="bg-ink border border-cream/15 rounded-lg p-3 text-cream/70 text-[11px] leading-relaxed overflow-auto max-h-[28rem] whitespace-pre-wrap">
              {prompt}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}

function Group({ label, hint, children }) {
  return (
    <div>
      <p className="text-cream font-semibold text-sm mb-1">{label}</p>
      {hint && <p className="text-cream/45 text-xs mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function Choice({ active, onClick, title, hint }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-left rounded-xl border px-4 py-3 transition w-full ${
        active ? 'border-gold bg-gold/[0.08]' : 'border-cream/15 hover:border-cream/30'
      }`}>
      <span className="block text-cream text-sm font-semibold">{title}</span>
      {hint && <span className="block text-cream/50 text-xs mt-0.5">{hint}</span>}
    </button>
  );
}

function Nav({ onBack, onNext }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      {onBack && <button onClick={onBack} className="text-cream/50 hover:text-cream text-sm">← Back</button>}
      <div className="flex-1" />
      {onNext && <button onClick={onNext} className="btn-primary text-sm">Continue →</button>}
    </div>
  );
}
