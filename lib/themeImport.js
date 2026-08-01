// Turns ONE pasted HTML document into a complete theme.
//
// The previous flow — create a page, paste a fragment, repeat — was backwards.
// A designer (or an AI) produces a single finished file; this splits it into the
// pieces the theme system needs, so the owner pastes once and gets a working
// site.
//
// What it extracts:
//   <head> ............. fonts / meta / third-party tags  -> head_snippet
//   <style> blocks ..... all CSS                          -> global_css
//   <header> or <nav> .. site chrome above the content    -> layout (before)
//   <footer> ........... site chrome below the content    -> layout (after)
//   what's left ........ the page body                    -> a page
//
// Multi-page sites are marked inline so one file can hold a whole website:
//
//   <!-- mimis:page slug="catering" title="Catering" -->
//     ...markup for /catering...
//   <!-- mimis:page slug="about" title="About Us" -->
//     ...markup for /about...
//
// Content before the first marker becomes the home page. With no markers at all
// the whole document is a single-page site.

const PAGE_MARKER = /<!--\s*mimis:page\s+([^>]*?)-->/gi;

export function importTheme(source) {
  const errors = [];
  const warnings = [];
  if (!source || !source.trim()) {
    return { ok: false, errors: ['Nothing to import — paste your HTML first.'] };
  }

  let doc = String(source);

  // ---- head -------------------------------------------------------------
  let headInner = '';
  const headMatch = doc.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch) {
    headInner = headMatch[1];
    doc = doc.replace(headMatch[0], '');
  }

  // ---- body ------------------------------------------------------------
  let body = doc;
  const bodyMatch = doc.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) body = bodyMatch[1];
  body = body
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '');

  // ---- CSS: pull every <style> from head and body ------------------------
  const cssChunks = [];
  const collectStyles = (html) => html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_m, css) => {
    cssChunks.push(css.trim());
    return '';
  });
  headInner = collectStyles(headInner);
  body = collectStyles(body);
  const globalCss = cssChunks.join('\n\n');

  // ---- JS: keep scripts with the page they belong to ---------------------
  // Scripts in <head> are usually third-party tags and stay in head_snippet.
  // Scripts in <body> are usually behaviour for the markup, so they travel
  // with the page rather than being hoisted where they might run too early.

  // ---- chrome: header / footer ------------------------------------------
  let before = '';
  let after = '';

  const headerMatch = body.match(/<header[\s\S]*?<\/header>/i);
  if (headerMatch) {
    before = headerMatch[0];
    body = body.replace(headerMatch[0], '');
  } else {
    const navMatch = body.match(/<nav[\s\S]*?<\/nav>/i);
    if (navMatch) {
      before = navMatch[0];
      body = body.replace(navMatch[0], '');
      warnings.push('No <header> found — used the first <nav> as the site header.');
    } else {
      warnings.push('No <header> or <nav> found. The theme will have no site-wide header.');
    }
  }

  const footerMatch = body.match(/<footer[\s\S]*?<\/footer>/i);
  if (footerMatch) {
    after = footerMatch[0];
    body = body.replace(footerMatch[0], '');
  } else {
    warnings.push('No <footer> found. The theme will have no site-wide footer.');
  }

  // Body-level scripts belong to the layout when they drive the chrome
  // (sticky headers, mobile menus, scroll reveals) — which is the common case.
  const layoutScripts = [];
  body = body.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi, (m) => {
    layoutScripts.push(m);
    return '';
  });
  body = body.replace(/<script[^>]*\bsrc=[^>]*>\s*<\/script>/gi, (m) => {
    layoutScripts.push(m);
    return '';
  });

  // ---- pages -------------------------------------------------------------
  const pages = [];
  const markers = [...body.matchAll(PAGE_MARKER)];

  if (!markers.length) {
    pages.push({ slug: '', title: 'Home', html: body.trim() });
  } else {
    const firstStart = markers[0].index;
    const homeHtml = body.slice(0, firstStart).trim();
    if (homeHtml) pages.push({ slug: '', title: 'Home', html: homeHtml });

    markers.forEach((m, i) => {
      const attrs = parseMarkerAttrs(m[1]);
      const start = m.index + m[0].length;
      const end = i + 1 < markers.length ? markers[i + 1].index : body.length;
      const html = body.slice(start, end).trim();
      const slug = (attrs.slug || '').trim().replace(/^\/+|\/+$/g, '');
      if (!slug) {
        errors.push(`A page marker is missing its slug: ${m[0]}`);
        return;
      }
      pages.push({ slug, title: attrs.title || titleize(slug), html });
    });
  }

  if (!pages.length) errors.push('No page content found in that file.');

  // ---- assemble the layout ----------------------------------------------
  const layoutHtml = [
    before.trim(),
    '<div data-mimis-outlet></div>',
    after.trim(),
    layoutScripts.join('\n'),
  ].filter(Boolean).join('\n\n');

  // ---- advisory checks ---------------------------------------------------
  if (!/mimis-logo/.test(before) && /<img[^>]*(logo|brand)/i.test(before)) {
    warnings.push('The header uses its own logo image. Swap it for <mimis-logo></mimis-logo> so it always matches your uploaded logo.');
  }
  if (!/<mimis-/.test(body)) {
    warnings.push('No live-data tags found (e.g. <mimis-menu>). The pages will be static — add them to show your real menu and prices.');
  }

  // The shop pages (menu, cart, checkout, rewards, tracking) take ALL their
  // styling from the --mimis-* tokens the theme declares. A theme that omits
  // them leaves the shop on the built-in dark fallback, which will clash with
  // most designs — so check for the core set and say exactly what's missing.
  const allCss = [globalCss, headInner].join('\n');
  const CORE_TOKENS = [
    '--mimis-bg', '--mimis-surface', '--mimis-text', '--mimis-text-soft',
    '--mimis-accent', '--mimis-accent-contrast', '--mimis-line',
    '--mimis-radius', '--mimis-font-body', '--mimis-font-display',
  ];
  const missingTokens = CORE_TOKENS.filter((t) => !new RegExp(`${t}\\s*:`).test(allCss));
  if (missingTokens.length === CORE_TOKENS.length) {
    warnings.push('This design defines none of the --mimis-* colour variables, so the menu, cart and checkout pages will stay on the default dark look instead of matching it. Add a :root{ --mimis-bg: …; --mimis-text: …; } block (see the design instructions).');
  } else if (missingTokens.length) {
    warnings.push(`Missing style variables: ${missingTokens.join(', ')}. The menu, cart and checkout pages use these to match the design — without them, parts fall back to the default dark look.`);
  }
  const reserved = ['checkout', 'cart', 'order-status', 'order-confirmed', 'admin', 'api', 'login', 'embed'];
  for (const p of pages) {
    if (reserved.includes(p.slug)) {
      errors.push(`"${p.slug}" is a reserved address used by the shop. Rename that page.`);
    }
    if (p.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) {
      errors.push(`"${p.slug}" isn't a valid address — use lowercase letters, numbers and hyphens.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    headSnippet: headInner.trim(),
    globalCss,
    layoutHtml,
    pages,
  };
}

function parseMarkerAttrs(str = '') {
  const attrs = {};
  const re = /([a-zA-Z_][\w-]*)\s*=\s*"([^"]*)"|([a-zA-Z_][\w-]*)\s*=\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(str))) {
    attrs[(m[1] || m[3]).toLowerCase()] = m[2] ?? m[4] ?? '';
  }
  return attrs;
}

function titleize(slug) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
