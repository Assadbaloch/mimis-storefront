import { normalizeEmbeds } from '@/lib/embed';
import { renderEmbeds } from '@/lib/embeds';
import { getEmbedContext } from '@/lib/themeContext';

// Renders one theme page: its HTML (with <mimis-*> embeds resolved), its own
// scoped CSS, and its optional JS.
//
// Page CSS is scoped to this page's wrapper so one page's styles can't leak
// into another during client-side navigation -- Next keeps previously-injected
// <style> tags alive across route changes, so without scoping, visiting page A
// then page B would leave A's rules applied to B.
//
// Page JS is emitted as-is. That is deliberate: same trust level as the theme
// layout, restricted to the owner role by RLS. See THEME-SYSTEM-SPEC §8.

export default async function ThemePageBody({ page }) {
  const ctx = await getEmbedContext();

  const scopeId = `tp-${page.id}`;
  const css = page.css ? scopeCss(page.css, `#${scopeId}`) : '';

  // Order matters: resolve <mimis-*> embeds first, then normalise any pasted
  // YouTube/Vimeo/media URLs (which may appear inside embed templates too).
  const html = normalizeEmbeds(renderEmbeds(page.html || '', ctx));

  return (
    <div id={scopeId} data-mimis-theme-page={page.slug}>
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {page.js && <script dangerouslySetInnerHTML={{ __html: page.js }} />}
    </div>
  );
}

// Prefixes selectors with the page scope, walking the CSS by brace depth.
//
// This used to be a single regex, which silently broke every responsive theme:
// rules nested inside @media were left UNSCOPED (`.tv-grid`, specificity 0,1,0)
// while their desktop counterparts were scoped (`#tp-x .tv-grid`, 1,1,0). The
// scoped desktop rule therefore beat the mobile rule on specificity no matter
// what the viewport was, so theme media queries never took effect. Descending
// into conditional at-rules and scoping their contents too is what fixes it.
//
// @keyframes / @font-face bodies are NOT selector lists, so they pass through
// untouched -- prefixing `from`/`to` or descriptors produces invalid CSS.
const CONDITIONAL_AT_RULES = new Set(['media', 'supports', 'container', 'layer', 'scope']);

function scopeCss(css, scope) {
  // Comments are stripped before parsing, not preserved. Leaving them in broke
  // this in two ways: a comment sitting directly above an at-rule made the
  // prelude start with "/*" instead of "@", so `@media` was misread as a
  // selector and the whole block was emitted as invalid CSS and dropped by the
  // browser -- which is exactly why theme media queries appeared to do nothing.
  // A comma inside a comment split the selector list, and a brace inside one
  // threw off brace matching. None of it reaches the user, so dropping comments
  // costs nothing and removes all three failure modes.
  return scopeBlock(String(css || '').replace(/\/\*[\s\S]*?\*\//g, ''), scope);
}

function scopeBlock(css, scope) {
  let out = '';
  let i = 0;

  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) {
      out += css.slice(i);
      break;
    }

    const close = matchBrace(css, open);
    const prelude = css.slice(i, open);
    const body = css.slice(open + 1, close);
    const trimmed = prelude.trim();

    if (!trimmed) {
      // Stray block with no selector -- drop it rather than emit `#scope {`.
      i = close + 1;
      continue;
    }

    if (trimmed.startsWith('@')) {
      const name = trimmed.slice(1).split(/[\s({]/)[0].toLowerCase();
      // Conditional groups wrap ordinary rules -- recurse so those get scoped.
      // Everything else (keyframes, font-face, page, property) is left alone.
      out += prelude + '{' + (CONDITIONAL_AT_RULES.has(name) ? scopeBlock(body, scope) : body) + '}';
    } else {
      const lead = prelude.slice(0, prelude.length - prelude.trimStart().length);
      out += lead + scopeSelectors(trimmed, scope) + ' {' + body + '}';
    }

    i = close + 1;
  }

  return out;
}

function scopeSelectors(selectorList, scope) {
  return selectorList
    .split(',')
    .map((s) => {
      const sel = s.trim();
      if (!sel) return sel;
      // html/body/:root rules from a pasted design apply to the page wrapper
      // rather than fighting the real document.
      if (/^(html|body)\b/i.test(sel) || /^:root\b/i.test(sel)) return scope;
      return `${scope} ${sel}`;
    })
    .filter(Boolean)
    .join(', ');
}

// Index of the `}` matching the `{` at `open`. Falls back to end-of-string on
// unbalanced CSS so a malformed paste degrades instead of throwing.
function matchBrace(css, open) {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    const c = css[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return css.length;
}
