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

// Prefixes top-level selectors with the page scope. @media / @keyframes /
// @font-face blocks pass through untouched -- naive prefixing of at-rules
// produces invalid CSS that silently drops whole blocks.
function scopeCss(css, scope) {
  return css.replace(/(^|\})\s*([^{}@]+)\s*\{/g, (match, brace, selectors) => {
    const scoped = selectors
      .split(',')
      .map((s) => {
        const sel = s.trim();
        if (!sel) return sel;
        // html/body/:root rules from a pasted design apply to the page wrapper
        // rather than fighting the real document.
        if (/^(html|body)\b/i.test(sel) || /^:root\b/i.test(sel)) return scope;
        return `${scope} ${sel}`;
      })
      .join(', ');
    return `${brace} ${scoped} {`;
  });
}
