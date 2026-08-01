import { getSupabasePublicClient } from '@/lib/supabaseClient';

// Theme resolution + layout splitting.
//
// A theme layout is a full HTML document containing a single outlet marker:
//
//   <div data-mimis-outlet></div>
//
// Next.js owns <html> and <body>, so we can't render the theme's document
// wholesale. Instead the layout is split into three parts -- head content,
// body-before-outlet, body-after-outlet -- and the React tree is rendered
// between the two body halves. The result is server-rendered HTML that is
// byte-for-byte the theme's own markup wrapped around our pages, which is what
// lets cart/checkout/order-status inherit the design automatically.
//
// SAFETY: if there is no active theme, or the layout is missing/invalid, this
// returns null and the app falls back to the existing React header/footer.
// The live site therefore cannot break by adding this system -- it only changes
// once a theme is deliberately activated.

const OUTLET_RE = /<div\b[^>]*\bdata-mimis-outlet\b[^>]*>\s*<\/div>|<div\b[^>]*\bdata-mimis-outlet\b[^>]*\/>/i;

export async function getActiveTheme() {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('themes')
    .select('id, name, layout_html, global_css, head_snippet')
    .eq('status', 'active')
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * Splits a theme layout document into renderable parts.
 * Returns null when the layout can't be used, so callers can fall back.
 */
export function splitLayout(layoutHtml) {
  if (!layoutHtml || typeof layoutHtml !== 'string') return null;
  if (!OUTLET_RE.test(layoutHtml)) return null;

  // Pull <head> content out; Next.js manages the real <head>, and its contents
  // are hoisted rather than rendered inline in <body>.
  let head = '';
  const headMatch = layoutHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch) head = headMatch[1];

  // Everything inside <body>, or the whole document if there's no body tag.
  let body = layoutHtml;
  const bodyMatch = layoutHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) body = bodyMatch[1];
  else body = layoutHtml.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '')
                        .replace(/<!doctype[^>]*>/i, '')
                        .replace(/<\/?html[^>]*>/gi, '');

  const parts = body.split(OUTLET_RE);
  if (parts.length < 2) return null;

  return {
    head,
    before: parts[0] ?? '',
    after: parts.slice(1).join('') ?? '',
  };
}

/** Resolves the active theme and its split layout in one call. */
export async function getThemeShell() {
  const theme = await getActiveTheme();
  if (!theme) return null;
  const layout = splitLayout(theme.layout_html);
  if (!layout) return null;
  return { theme, layout };
}

/** A published page of the active theme, by slug. '' is the home page. */
export async function getThemePage(slug) {
  const supabase = getSupabasePublicClient();
  const { data: theme } = await supabase
    .from('themes').select('id').eq('status', 'active').maybeSingle();
  if (!theme) return null;

  const { data } = await supabase
    .from('theme_pages')
    .select('*')
    .eq('theme_id', theme.id)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  return data || null;
}
