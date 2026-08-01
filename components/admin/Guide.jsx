'use client';
import { useState } from 'react';

// Explanatory UI for the admin. The theme editor in particular exposes concepts
// (layout / global CSS / head / pages) that mean nothing to someone who hasn't
// built a website before -- without this, the tabs are four identical code
// boxes and there is no way to guess which one does what.

/** Collapsible "what is this?" panel. Open by default the first time. */
export function GuidePanel({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gold/25 bg-gold/[0.06] mb-5">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left">
        <span className="text-gold">💡</span>
        <span className="text-cream font-semibold text-sm flex-1">{title}</span>
        <span className="text-cream/45 text-xs">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="px-4 pb-4 text-cream/70 text-sm leading-relaxed space-y-2">{children}</div>}
    </div>
  );
}

/** One-line hint under a field or tab. */
export function Hint({ children }) {
  return <p className="text-cream/50 text-xs leading-relaxed mb-3">{children}</p>;
}

/** Numbered getting-started steps. */
export function Steps({ items }) {
  return (
    <ol className="space-y-2 mt-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 w-5 h-5 rounded-full bg-gold text-ink text-[11px] font-bold grid place-items-center mt-0.5">
            {i + 1}
          </span>
          <span className="text-cream/70 text-sm">{it}</span>
        </li>
      ))}
    </ol>
  );
}

// Copy for each theme-editor tab, kept in one place so wording stays consistent.
export const THEME_TAB_HELP = {
  layout: {
    title: 'Layout — the frame around every page',
    body: (
      <>
        <p>
          This is the header, footer and overall shell that appears on <strong>every</strong> page —
          including the cart and checkout. Write it once here rather than repeating it on each page.
        </p>
        <p>
          It must contain <code className="text-gold">&lt;div data-mimis-outlet&gt;&lt;/div&gt;</code> exactly once.
          That marks the spot where each page&rsquo;s content drops in. Without it the site falls back
          to the default design.
        </p>
        <p>
          Use <code className="text-gold">&lt;mimis-logo&gt;</code> for the logo rather than an image
          you paste in — that way it always matches the logo uploaded in Storefront Settings.
        </p>
      </>
    ),
  },
  css: {
    title: 'Global CSS — styling shared by every page',
    body: (
      <>
        <p>
          Styles that apply site-wide: colours, fonts, buttons, card designs, animations.
          Anything you&rsquo;d otherwise repeat on several pages belongs here.
        </p>
        <p>
          Set the <code className="text-gold">--mimis-*</code> colour variables here and the cart and
          checkout pages pick them up automatically, so the whole site stays visually consistent.
        </p>
      </>
    ),
  },
  head: {
    title: 'Head — fonts and third-party scripts',
    body: (
      <>
        <p>
          Extra tags for the top of the page: Google Fonts links, tracking pixels, a chat widget,
          verification meta tags.
        </p>
        <p>Leave this empty if you don&rsquo;t need any of that — it&rsquo;s optional.</p>
      </>
    ),
  },
  pages: {
    title: 'Pages — the actual content',
    body: (
      <>
        <p>
          Each page is one web address: the home page, a catering page, a specials page. Every page
          renders inside the layout above, so a page holds only its content — not the header and footer.
        </p>
        <p>
          Pages come from your imported HTML file: one file, split into pages by
          <code className="text-gold"> &lt;!-- mimis:page --&gt;</code> markers. To add a page,
          regenerate the design with that page included and import it again — that keeps the file
          you paste as the single source of truth for the whole site.
        </p>
        <p>
          Pages stay invisible to customers until you tick Published.
        </p>
      </>
    ),
  },
};
