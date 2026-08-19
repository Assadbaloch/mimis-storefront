'use client';
import { useEffect, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { getSectionType } from '@/lib/sectionTypes';
import { isVideoFile, toEmbedUrl } from '@/lib/embed';
import MediaPicker from './MediaPicker';

// Small "or paste a link" row shared by every media field.
//
// The library and the uploader already existed; what was missing was a way to
// use a YouTube/Vimeo clip anywhere media is accepted. Previously only a couple
// of block types had a separate embed_url text box, so the news strip and the
// slideshow could take pictures but not video links.
function UrlAdd({ onAdd, placeholder }) {
  const [url, setUrl] = useState('');
  function submit() {
    const trimmed = url.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setUrl('');
  }
  return (
    <div className="flex gap-2 mt-2">
      <input
        className="flex-1 bg-black/25 border border-cream/12 rounded-lg px-3 py-1.5 text-cream text-xs placeholder:text-cream/30"
        placeholder={placeholder}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
      />
      <button type="button" onClick={submit} disabled={!url.trim()}
        className="text-gold text-xs font-bold uppercase tracking-wide disabled:opacity-30">
        Add
      </button>
    </div>
  );
}

// Thumbnail that copes with all three kinds of value: an uploaded image, an
// uploaded video file, or a YouTube/Vimeo link (which has no file extension and
// would otherwise render as a broken image).
function Thumb({ url, className }) {
  if (toEmbedUrl(url) && !isVideoFile(url)) {
    return (
      <div className={`${className} bg-black/40 grid place-items-center text-cream/60 text-[10px] text-center px-1`}>
        ▶ Video link
      </div>
    );
  }
  if (isVideoFile(url)) return <video src={url} className={className} muted />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={className} />;
}

// Renders the settings form for one section, driven entirely by the `fields`
// array in lib/sectionTypes.js. No per-type form components -- adding a new
// section type never requires touching this file.

export default function SectionEditor({ section, onChange, onRemove, onMove, isFirst, isLast }) {
  const def = getSectionType(section.type);
  const [open, setOpen] = useState(false);
  if (!def) {
    return (
      <div className="rounded-xl border border-brick/40 bg-brick/10 p-4 text-cream/70 text-sm">
        Unknown section type &ldquo;{section.type}&rdquo;. It may have been removed from the code.
      </div>
    );
  }

  const set = (key, value) => onChange({ ...section, config: { ...section.config, [key]: value } });

  return (
    <div className={`rounded-xl border bg-cream/[0.03] ${section.active === false ? 'border-cream/10 opacity-60' : 'border-cream/15'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl leading-none">{def.icon}</span>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex-1 text-left">
          <span className="text-cream font-semibold text-sm">{def.label}</span>
          <span className="block text-cream/45 text-xs truncate">
            {summarise(section, def)}
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <IconBtn label="Move up" disabled={isFirst} onClick={() => onMove(-1)}>↑</IconBtn>
          <IconBtn label="Move down" disabled={isLast} onClick={() => onMove(1)}>↓</IconBtn>
          <IconBtn label={section.active === false ? 'Show section' : 'Hide section'}
            onClick={() => onChange({ ...section, active: section.active === false })}>
            {section.active === false ? '🚫' : '👁'}
          </IconBtn>
          <IconBtn label="Delete section" onClick={onRemove}>🗑</IconBtn>
          <IconBtn label={open ? 'Collapse' : 'Edit'} onClick={() => setOpen((o) => !o)}>{open ? '▲' : '▼'}</IconBtn>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-cream/10">
          <p className="text-cream/45 text-xs">{def.description}</p>
          {def.fields.map((f) => (
            <Field key={f.key} field={f} value={section.config?.[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}
      className="w-7 h-7 rounded-md text-xs text-cream/60 hover:text-cream hover:bg-cream/10 disabled:opacity-25 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}

// A one-line preview so a collapsed list of sections is still readable.
function summarise(section, def) {
  const c = section.config || {};
  const first = c.headline || c.label || c.title || c.eyebrow;
  if (first) return String(first);
  if (section.type === 'product_category' && c.category) return `Category: ${c.category}`;
  if (section.type === 'product_showcase') return `${(c.item_ids || []).length} item(s)`;
  if (section.type === 'custom_code') return c.html ? 'Custom HTML' : 'Empty — add code';
  return def.description;
}

function Field({ field, value, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // Index of the media_multi entry currently being replaced, or null.
  const [replacingIdx, setReplacingIdx] = useState(null);
  const label = (
    <label className="block text-cream/60 text-xs uppercase tracking-wide mb-1">
      {field.label}{field.required && <span className="text-brick"> *</span>}
    </label>
  );
  const input = 'w-full bg-ink border border-cream/15 rounded-lg px-3 py-2 text-cream text-sm placeholder:text-cream/30';

  switch (field.type) {
    case 'textarea':
      return <div>{label}<textarea rows={3} className={input} value={value ?? ''} placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)} /></div>;

    case 'code':
      return (
        <div>
          {label}
          <textarea rows={field.language === 'css' ? 6 : 10} spellCheck={false}
            className={`${input} font-mono text-xs leading-relaxed`}
            placeholder={field.language === 'css' ? '.my-class { color: #e6b95c; }' : '<div class="my-class">Hello</div>'}
            value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
          {field.language === 'html' && (
            <p className="text-cream/40 text-[11px] mt-1">
              YouTube/Vimeo links are turned into working embeds automatically. Paste an uploaded
              image or video URL on its own line to drop it in.
            </p>
          )}
          {field.language === 'css' && (
            <p className="text-cream/40 text-[11px] mt-1">Styles only affect this section.</p>
          )}
        </div>
      );

    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={value ?? field.default ?? false} onChange={(e) => onChange(e.target.checked)} />
          <span className="text-cream/75 text-sm">{field.label}</span>
        </label>
      );

    case 'select':
      return <div>{label}<select className={input} value={value ?? field.default ?? ''} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select></div>;

    case 'range':
      return (
        <div>{label}
          <div className="flex items-center gap-3">
            <input type="range" min={field.min} max={field.max} className="flex-1"
              value={value ?? field.default ?? 0} onChange={(e) => onChange(Number(e.target.value))} />
            <span className="text-cream/60 text-xs w-12 text-right">{value ?? field.default ?? 0}{field.suffix || ''}</span>
          </div>
        </div>
      );

    case 'number':
      return <div>{label}<input type="number" className={input} value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} /></div>;

    case 'media':
      return (
        <div>
          {label}
          <div className="flex items-center gap-3">
            {value ? (
              <div className="relative">
                <Thumb url={value} className="w-24 h-16 object-cover rounded-lg" />
              </div>
            ) : (
              <div className="w-24 h-16 rounded-lg border border-dashed border-cream/20 grid place-items-center text-cream/30 text-xs">
                None
              </div>
            )}
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => setPickerOpen(true)} className="text-gold text-sm text-left">
                {value ? 'Change' : 'Choose from library or upload'}
              </button>
              {value && <button type="button" onClick={() => onChange('')} className="text-cream/45 text-xs text-left hover:text-brick">Remove</button>}
            </div>
          </div>
          {/* Third way in: paste a link. Every media field offers library,
              upload AND a URL, so a YouTube clip is never a special case that
              only some blocks happen to support. */}
          <UrlAdd
            placeholder="…or paste a YouTube / Vimeo / image link"
            onAdd={(url) => onChange(url)}
          />
          <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(url) => onChange(url)} />
        </div>
      );

    case 'media_multi': {
      const list = Array.isArray(value) ? value : [];
      // Order is meaningful here -- these lists drive slideshows and photo
      // grids, where "which picture is first" is a real editorial decision.
      // Without reorder the only way to move a slide was remove + re-add, which
      // appends to the end; and replacing one in place was impossible.
      const move = (i, delta) => {
        const j = i + delta;
        if (j < 0 || j >= list.length) return;
        const next = [...list];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
      };
      const replaceAt = (i, url) => onChange(list.map((u, j) => (j === i ? url : u)));
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-2 mb-2">
            {list.map((url, i) => (
              <div key={i} className="relative group">
                <Thumb url={url} className="w-20 h-14 object-cover rounded-md" />
                <button type="button" title="Remove" onClick={() => onChange(list.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-brick text-cream w-5 h-5 rounded-full text-xs leading-none">×</button>
                <div className="flex items-center justify-between mt-1 px-0.5">
                  <button type="button" title="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}
                    className="text-cream/40 hover:text-cream disabled:opacity-20 text-xs leading-none">←</button>
                  <button type="button" title="Replace this one" onClick={() => setReplacingIdx(i)}
                    className="text-cream/40 hover:text-gold text-[10px] leading-none">swap</button>
                  <button type="button" title="Move later" disabled={i === list.length - 1} onClick={() => move(i, 1)}
                    className="text-cream/40 hover:text-cream disabled:opacity-20 text-xs leading-none">→</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setPickerOpen(true)} className="text-gold text-sm">
            + Choose from library or upload
          </button>
          <UrlAdd
            placeholder="…or paste a YouTube / Vimeo / image link and press Add"
            onAdd={(url) => onChange([...list, url])}
          />
          <MediaPicker open={pickerOpen} multiple onClose={() => setPickerOpen(false)}
            onSelect={(urls) => onChange([...list, ...urls])} />
          {/* Replace flow: same picker, but the chosen file overwrites one slot
              instead of being appended, so position is preserved. */}
          <MediaPicker open={replacingIdx !== null} onClose={() => setReplacingIdx(null)}
            onSelect={(url) => { replaceAt(replacingIdx, Array.isArray(url) ? url[0] : url); setReplacingIdx(null); }} />
        </div>
      );
    }

    case 'repeater': {
      const list = Array.isArray(value) ? value : [];
      const itemFields = field.item_fields || [];
      const move = (i, delta) => {
        const j = i + delta;
        if (j < 0 || j >= list.length) return;
        const next = [...list];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
      };
      const setItem = (i, key, v) =>
        onChange(list.map((it, j) => (j === i ? { ...it, [key]: v } : it)));
      return (
        <div>
          {label}
          <div className="space-y-2">
            {list.map((item, i) => (
              <div key={i} className="border border-cream/10 rounded-lg bg-ink/40">
                <div className="flex items-center gap-1 px-3 py-2 border-b border-cream/10">
                  <span className="flex-1 text-cream/70 text-xs truncate">
                    {item?.[field.item_title] || `Item ${i + 1}`}
                  </span>
                  <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</IconBtn>
                  <IconBtn label="Move down" disabled={i === list.length - 1} onClick={() => move(i, 1)}>↓</IconBtn>
                  <IconBtn label="Remove" onClick={() => onChange(list.filter((_, j) => j !== i))}>🗑</IconBtn>
                </div>
                <div className="p-3 space-y-3">
                  {itemFields.map((sub) => (
                    <Field key={sub.key} field={sub} value={item?.[sub.key]}
                      onChange={(v) => setItem(i, sub.key, v)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => onChange([...list, {}])} className="text-gold text-sm mt-2">
            + {field.add_label || 'Add item'}
          </button>
        </div>
      );
    }

    case 'menu_category':
      return <div>{label}<MenuCategorySelect value={value} onChange={onChange} className={input} /></div>;

    case 'menu_items':
      return <div>{label}<MenuItemPicker value={value} onChange={onChange} /></div>;

    default:
      return <div>{label}<input className={input} value={value ?? ''} placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)} /></div>;
  }
}

// Categories come from the live Clover-synced menu, never a hardcoded list --
// a new category in Clover shows up here on the next sync automatically.
function MenuCategorySelect({ value, onChange, className }) {
  const [cats, setCats] = useState([]);
  useEffect(() => {
    getSupabasePublicClient().from('menu_items').select('category').eq('available', true)
      .then(({ data }) => {
        const set = new Set((data || []).map((r) => (r.category || '').trim()).filter(Boolean));
        setCats(Array.from(set).sort());
      });
  }, []);
  return (
    <select className={className} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose a category…</option>
      {cats.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}

function MenuItemPicker({ value, onChange }) {
  const selected = Array.isArray(value) ? value : [];
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getSupabasePublicClient().from('menu_items').select('id, name, category, price_cents')
      .eq('available', true).order('category').order('name')
      .then(({ data }) => setItems(data || []));
  }, []);

  const chosen = selected.map((id) => items.find((i) => i.id === id)).filter(Boolean);
  const results = search
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) && !selected.includes(i.id)).slice(0, 8)
    : [];

  return (
    <div>
      {chosen.length > 0 && (
        <ul className="space-y-1 mb-2">
          {chosen.map((item, idx) => (
            <li key={item.id} className="flex items-center gap-2 bg-ink border border-cream/10 rounded-lg px-3 py-1.5">
              <span className="flex-1 text-cream/80 text-sm truncate">{item.name}</span>
              <button type="button" title="Move up" disabled={idx === 0}
                onClick={() => { const n = [...selected]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; onChange(n); }}
                className="text-cream/40 hover:text-cream disabled:opacity-25 text-xs">↑</button>
              <button type="button" title="Remove"
                onClick={() => onChange(selected.filter((id) => id !== item.id))}
                className="text-cream/40 hover:text-brick text-xs">×</button>
            </li>
          ))}
        </ul>
      )}
      <input placeholder="Search menu items to add…" value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-ink border border-cream/15 rounded-lg px-3 py-2 text-cream text-sm placeholder:text-cream/30" />
      {results.length > 0 && (
        <ul className="mt-1 border border-cream/10 rounded-lg overflow-hidden">
          {results.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => { onChange([...selected, item.id]); setSearch(''); }}
                className="w-full text-left px-3 py-2 text-sm text-cream/75 hover:bg-cream/10">
                {item.name} <span className="text-cream/40">· {item.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
