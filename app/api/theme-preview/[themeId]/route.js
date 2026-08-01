import { createClient } from '@supabase/supabase-js';
import { renderEmbeds } from '@/lib/embeds';
import { splitLayout } from '@/lib/theme';

// Renders any theme -- including drafts -- as a complete HTML document, so the
// owner can see a design before making it live.
//
// Runs entirely on the OWNER'S OWN SESSION rather than the service role. The
// themes_owner_all RLS policy already grants owners full access to drafts, so
// elevated rights were never actually needed -- and depending on
// SUPABASE_SERVICE_ROLE_KEY meant this route 500'd whenever that env var was
// unset (which is exactly what happened in production on 2026-08-01).
// Using the caller's token also means authorisation is enforced by the database
// rather than by an `if` in this file.

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://igchqqyassrfpsliyjec.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnY2hxcXlhc3NyZnBzbGl5amVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTM5MDIsImV4cCI6MjA5NjQyOTkwMn0.Vr4yvjKVFSj4dAi2HI5d0Y09_AvbJoL9BnitI4irTo8';

export async function GET(request, { params }) {
  try {
    const { themeId } = await params;
    const url = new URL(request.url);
    const token = url.searchParams.get('token')
      || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) return page('Not signed in', 'Open this preview from the Themes screen.', 401);

    // Every query below runs AS THE OWNER, so RLS decides what is visible.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      db: { schema: 'mimis' },
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: theme, error: themeErr } = await supabase
      .from('themes').select('*').eq('id', themeId).maybeSingle();

    if (themeErr) return page('Could not load theme', themeErr.message, 500);
    if (!theme) {
      // Either it doesn't exist, or RLS hid it because the caller isn't an owner.
      return page('Theme not available', 'It may have been deleted, or your account may not have owner access.', 404);
    }

    const slug = url.searchParams.get('page') ?? '';

    // Every page of this theme, so links inside the preview can be rewritten to
    // stay inside the preview instead of bouncing to the live site.
    const { data: allPages } = await supabase
      .from('theme_pages').select('slug, title, status').eq('theme_id', themeId).order('sort_order');
    const pageRow = (await supabase
      .from('theme_pages').select('*').eq('theme_id', themeId).eq('slug', slug).maybeSingle()).data;

    const [menu, locations, hours, brand] = await Promise.all([
      supabase.from('menu_items').select('*').eq('available', true).order('sort_order'),
      supabase.from('store_locations').select('*').order('location'),
      supabase.from('store_hours').select('*'),
      supabase.from('storefront_settings').select('*').eq('id', 1).maybeSingle(),
    ]);
    const ctx = {
      menuItems: menu.data || [],
      locations: locations.data || [],
      hours: hours.data || [],
      brand: brand.data || {},
    };

    const layout = splitLayout(theme.layout_html);
    const bodyHtml = pageRow
      ? renderEmbeds(pageRow.html || '', ctx)
      : `<div style="padding:60px 24px;text-align:center;font:16px system-ui">
           <p>This theme has no page at <code>/${escapeHtml(slug)}</code> yet.</p>
         </div>`;

    // Keep navigation inside the preview. Without this, clicking "Menu" in the
    // themed header left the preview entirely and loaded the live site, which
    // reads as the design being broken.
    const themeSlugs = new Set((allPages || []).map((p) => p.slug));
    const previewHref = (s) =>
      `/api/theme-preview/${themeId}?page=${encodeURIComponent(s)}&token=${encodeURIComponent(token)}`;
    const rewrite = (html) => rewriteLinks(html, themeSlugs, previewHref);

    const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview — ${escapeHtml(theme.name)}</title>
<meta name="robots" content="noindex,nofollow">
${theme.head_snippet || ''}
${layout?.head || ''}
<style>${theme.global_css || ''}</style>
${pageRow?.css ? `<style>${pageRow.css}</style>` : ''}
<style>
#mimisPreviewBar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#111;color:#fff;
  font:600 12px/1.5 system-ui,sans-serif;padding:9px 14px;letter-spacing:.03em;
  display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap}
#mimisPreviewPages{display:flex;gap:10px;flex-wrap:wrap}
#mimisPreviewPages a{color:#bbb;text-decoration:none;padding:2px 8px;border-radius:99px;border:1px solid #333}
#mimisPreviewPages a.on{color:#111;background:#F7BB0A;border-color:#F7BB0A}
body{padding-bottom:52px}
</style>
</head>
<body>
${layout ? rewrite(renderEmbeds(layout.before, ctx)) : ''}
${rewrite(bodyHtml)}
${layout ? rewrite(renderEmbeds(layout.after, ctx)) : ''}
<div id="mimisPreviewBar">
  <span>PREVIEW · ${escapeHtml(theme.name)} · ${theme.status === 'active' ? 'this design is LIVE' : 'not live — customers still see the current site'}${!layout ? ' · ⚠ layout has no <div data-mimis-outlet>' : ''}</span>
  ${(allPages || []).length > 1 ? `<span id="mimisPreviewPages">${(allPages || []).map((p) => `<a href="${previewHref(p.slug)}"${p.slug === slug ? ' class="on"' : ''}>${escapeHtml(p.slug === '' ? 'Home' : p.title)}</a>`).join('')}</span>` : ''}
</div>
<script>
(function(){
  /* Shop pages (menu, cart, checkout) are real application pages, not part of
     the theme, so they can't render inside a preview. Explain that instead of
     letting the click dump the viewer back onto the live site. */
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('[data-mimis-shop-link]');
    if(!a) return;
    e.preventDefault();
    var name = a.getAttribute('data-mimis-shop-link');
    var n = document.getElementById('mimisPreviewNote');
    if(!n){
      n = document.createElement('div');
      n.id = 'mimisPreviewNote';
      n.style.cssText = 'position:fixed;left:50%;bottom:60px;transform:translateX(-50%);z-index:2147483001;'
        + 'background:#111;color:#fff;padding:12px 18px;border-radius:10px;max-width:min(90vw,420px);'
        + 'font:500 13px/1.5 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4);text-align:center';
      document.body.appendChild(n);
    }
    n.textContent = 'The "' + name + '" page is part of the shop, not the theme. It will use this design once the theme is live.';
    clearTimeout(window.__mimisNoteT);
    window.__mimisNoteT = setTimeout(function(){ n.remove(); }, 4200);
  });
})();
</script>
${pageRow?.js ? `<script>${pageRow.js}</script>` : ''}
</body>
</html>`;

    return new Response(doc, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    // Never leave a blank 500 -- show what actually went wrong, since this page
    // is only ever seen by the owner.
    return page('Preview failed', String(err?.message || err), 500);
  }
}

// Rewrites internal links so a preview behaves like a real site.
//
//  * links to a page of THIS theme  -> the equivalent preview URL
//  * links to shop routes (/menu, /cart, /checkout ...) -> flagged, because
//    those are real React pages that can't be rendered inside a preview. They
//    get an attribute the click handler below uses to explain that, rather than
//    silently navigating away to the live site.
//  * external links are left alone.
function rewriteLinks(html, themeSlugs, previewHref) {
  const SHOP_ROUTES = ['menu', 'cart', 'checkout', 'rewards', 'order-status', 'order-confirmed'];

  return String(html || '').replace(/href\s*=\s*("|')(\/[^"'#]*)\1/gi, (match, q, href) => {
    const clean = href.split('?')[0].replace(/^\/+|\/+$/g, '');

    if (themeSlugs.has(clean)) return `href=${q}${previewHref(clean)}${q}`;
    if (clean === '' && themeSlugs.has('')) return `href=${q}${previewHref('')}${q}`;
    if (SHOP_ROUTES.includes(clean)) {
      return `href=${q}#${q} data-mimis-shop-link=${q}${clean}${q}`;
    }
    return match;
  });
}

function page(title, detail, status) {
  return new Response(`<!doctype html><html><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title></head>
<body style="font:15px/1.6 system-ui,sans-serif;padding:60px 24px;text-align:center;color:#222">
<h1 style="font-size:20px;margin:0 0 8px">${escapeHtml(title)}</h1>
<p style="color:#666;margin:0">${escapeHtml(detail)}</p>
</body></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
