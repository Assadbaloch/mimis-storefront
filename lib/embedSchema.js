// The copy-paste reference handed to an AI along with a design brief.
//
// Generated from one place so it cannot drift from what lib/embeds.js actually
// implements. If an embed is added there, add it here in the same commit.

// Two prompt shapes: a single landing page, or a whole multi-page site.
// The difference is only the output section, so the reference stays identical
// and can't drift between the two.
export const PROMPT_MODES = [
  {
    key: 'single',
    label: 'One-page website',
    blurb: 'Everything on a single scrolling page. Best for a simple, punchy site.',
  },
  {
    key: 'multi',
    label: 'Multi-page website',
    blurb: 'Separate pages — home, catering, about — all in one file.',
  },
];

function outputSection(mode) {
  if (mode === 'multi') {
    return `## Output — MULTI-PAGE SITE

Return ONE complete HTML file containing the whole site.

- Put the shared header in \`<header>\` and the shared footer in \`<footer>\`.
  They are extracted automatically and shown on every page — write them once.
- Put all CSS in a single \`<style>\` block in \`<head>\`.
- Content before the first page marker becomes the HOME page.
- Start each additional page with a marker comment:

\`\`\`html
<!-- mimis:page slug="catering" title="Catering" -->
\`\`\`

Example shape:

\`\`\`html
<!doctype html>
<html>
<head><style>/* all CSS */</style></head>
<body>
  <header>…shared header…</header>

  …home page sections…

  <!-- mimis:page slug="catering" title="Catering" -->
  …catering page sections…

  <!-- mimis:page slug="about" title="About Us" -->
  …about page sections…

  <footer>…shared footer…</footer>
</body>
</html>
\`\`\`

Suggested pages: home, catering, about. Do NOT create pages named
checkout, cart, order-status or admin — those already exist.`;
  }

  return `## Output — ONE-PAGE SITE

Return ONE complete HTML file.

- Shared header in \`<header>\`, shared footer in \`<footer>\` — these are
  extracted automatically and reused across the shop's other pages.
- All CSS in a single \`<style>\` block in \`<head>\`.
- Everything between header and footer becomes the home page.
- Use in-page anchors (e.g. \`href="#menu"\`) to move between sections.`;
}

export function buildSchemaDoc({ categories = [], locations = [], mode = 'single' } = {}) {
  const catList = categories.length
    ? categories.map((c) => `  - "${c}"`).join('\n')
    : '  (none synced yet)';
  const locList = locations.length
    ? locations.map((l) => `  - "${l}"`).join('\n')
    : '  - "Madison Heights"';

  return `# Mimi's Pizza — Storefront Theme Authoring Guide

You are writing a complete, self-contained HTML page for Mimi's Pizza & Burger.
Write normal HTML/CSS/JS. Design it however the brief asks. Then use the tags
below wherever live data or ordering is needed.

## Absolute rules

1. NEVER hardcode menu items, prices, the logo, the phone number, or the
   address. They change, and a stale price on a live site is a real problem.
   Always use the tags below — they are filled in from the live system.
2. Use \`<mimis-logo></mimis-logo>\` for the logo. Never an <img> you invent.
3. Everything you write is styled by your own CSS. These tags accept a
   \`class\` attribute and, where noted, a \`<template>\` so the markup is yours.

## Brand (never invent these)

\`\`\`html
<mimis-logo class="my-logo"></mimis-logo>
<mimis-brand-name></mimis-brand-name>
<mimis-tagline></mimis-tagline>
<mimis-phone location="Madison Heights"></mimis-phone>
<mimis-address location="Madison Heights"></mimis-address>
<mimis-hours location="Madison Heights"></mimis-hours>
\`\`\`

Available locations:
${locList}

## Menu

\`\`\`html
<!-- every item in a category -->
<mimis-menu category="Burgers"></mimis-menu>

<!-- with options -->
<mimis-menu category="Burgers" limit="6" columns="3" sort="price"></mimis-menu>

<!-- only items that have a photo — use this on showcase grids -->
<mimis-menu category="Burgers" with-image limit="4"></mimis-menu>

<!-- specific items, in this order -->
<mimis-items ids="uuid-1,uuid-2"></mimis-items>

<!-- one item -->
<mimis-item id="uuid-1"></mimis-item>

<!-- the list of category names -->
<mimis-categories></mimis-categories>
\`\`\`

\`sort\` accepts: \`price\`, \`price-desc\`, \`name\`.

Available categories:
${catList}

### Using your own markup (preferred)

Put a \`<template>\` inside and it is repeated once per item, so the menu looks
native to your design instead of inheriting default styles:

\`\`\`html
<mimis-menu category="Burgers" limit="3">
  <template>
    <article class="card">
      <img src="{{image}}" alt="{{name}}">
      <h3>{{name}}</h3>
      <p>{{description}}</p>
      <span class="price">{{price}}</span>
      <mimis-add-to-cart item="{{id}}" class="btn">Add to order</mimis-add-to-cart>
    </article>
  </template>
</mimis-menu>
\`\`\`

Tokens available inside a template:
\`{{id}}\` \`{{name}}\` \`{{description}}\` \`{{price}}\` \`{{price_cents}}\`
\`{{image}}\` \`{{category}}\` \`{{badge}}\` \`{{available}}\`

## Ordering

\`\`\`html
<mimis-add-to-cart item="ITEM_ID" class="btn">Add to order</mimis-add-to-cart>
<mimis-add-to-cart item="ITEM_ID" qty="2">Add two</mimis-add-to-cart>

<mimis-cart-count></mimis-cart-count>     <!-- live number of items -->
<mimis-cart-total></mimis-cart-total>     <!-- live cart total -->
<mimis-checkout-button class="btn">Checkout</mimis-checkout-button>
\`\`\`

Add-to-cart works from a plain static page — no JavaScript needed from you.

## Pages that already exist (link to them, don't rebuild them)

- \`/menu\` — full menu with item options
- \`/cart\` — the cart
- \`/checkout\` — payment (handled securely; never rebuild)
- \`/rewards\` — loyalty
- \`/order-status\` — order tracking

## Theme layout (only when writing the site shell, not a page)

The shell must contain exactly one outlet where pages render:

\`\`\`html
<div data-mimis-outlet></div>
\`\`\`

REQUIRED: define these CSS variables in a :root block, using your design's own
palette. The menu, cart, checkout, rewards and order-tracking pages are built
entirely from these variables — they are how those pages adopt your design.

\`\`\`css
:root{
  --mimis-bg: #FFFFFF;                      /* page background            */
  --mimis-surface: #F7F7F5;                 /* card / panel background    */
  --mimis-text: #14181F;                    /* main text                  */
  --mimis-text-soft: rgba(20,24,31,.65);    /* secondary text             */
  --mimis-accent: #C8102E;                  /* solid buttons              */
  --mimis-accent-contrast: #FFFFFF;         /* text on those buttons      */
  --mimis-line: rgba(20,24,31,.12);         /* borders / dividers         */
  --mimis-radius: 14px;                     /* card corner radius         */
  --mimis-font-body: 'Inter', system-ui, sans-serif;
  --mimis-font-display: 'Anton', Impact, sans-serif;
}
\`\`\`

Optional extras (they default to values derived from the ones above, so only
set them if you want something different):

\`\`\`css
:root{
  --mimis-surface-strong: #FFFFFF;          /* opaque modal / sheet background */
  --mimis-highlight: #F7BB0A;               /* prices, links, active states    */
  --mimis-highlight-contrast: #14181F;      /* text on the highlight colour    */
  --mimis-danger: #C0392B;                  /* error / cancelled states        */
}
\`\`\`

Every colour must come from your design — never leave these at values that
don't match the rest of the page, and make sure --mimis-text is readable on
both --mimis-bg and --mimis-surface.

## Media

Images and videos uploaded in Admin → Media have direct URLs. Paste one on its
own line in a page and it becomes a responsive image or video player. YouTube
and Vimeo links are turned into working embeds automatically.

${outputSection(mode)}
`;
}
