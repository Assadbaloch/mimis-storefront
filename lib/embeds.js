import { formatPrice, displayName, displayCategory, categorySortIndex } from '@/lib/format';

// Server-side rendering of <mimis-*> embeds inside theme HTML.
//
// Why server-side: menu content must be in the HTML that search engines and
// social scrapers receive, and must not flash in after load. Interactive bits
// (add to cart, live cart totals) are hydrated afterwards by CartBridge via
// event delegation, so a pasted static page gets working commerce without the
// designer wiring anything up.
//
// Embeds are matched by tag rather than parsed with a DOM library -- the app
// has no parser dependency, and custom elements are flat and predictable. The
// matcher handles paired tags, self-closing tags, and attributes in any order.
// Anything unrecognised is left untouched rather than deleted, so a typo shows
// up as visible markup instead of silently vanishing.

// Built fresh per call, never shared. These are /g regexes and renderEmbeds is
// re-entrant -- a template can contain another embed, which calls back in while
// an outer .replace() is still walking. Module-level instances share lastIndex
// across those nested calls, so the outer pass silently skips matches and the
// inner tag survives as literal markup.
const pairedRe = () => /<mimis-([a-z-]+)((?:\s+[^>]*?)?)>([\s\S]*?)<\/mimis-\1\s*>/gi;
const selfClosingRe = () => /<mimis-([a-z-]+)((?:\s+[^>]*?)?)\/>/gi;

export function renderEmbeds(html, ctx) {
  if (!html) return '';
  let out = String(html);

  // Paired first (they may contain a <template>), then self-closing.
  out = out.replace(pairedRe(), (match, name, attrString, inner) =>
    renderOne(name.toLowerCase(), parseAttrs(attrString), inner, ctx, match));

  out = out.replace(selfClosingRe(), (match, name, attrString) =>
    renderOne(name.toLowerCase(), parseAttrs(attrString), '', ctx, match));

  return out;
}

function parseAttrs(str = '') {
  const attrs = {};
  const re = /([a-zA-Z_:][-\w:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(str))) attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? '';
  // Boolean attributes (no value)
  for (const bare of str.split(/\s+/)) {
    const k = bare.trim().toLowerCase();
    if (k && !k.includes('=') && !(k in attrs)) attrs[k] = '';
  }
  return attrs;
}

function renderOne(name, attrs, inner, ctx, original) {
  switch (name) {
    case 'menu':      return renderList(pickByCategory(ctx.menuItems, attrs), attrs, inner, ctx);
    case 'items':     return renderList(pickByIds(ctx.menuItems, attrs), attrs, inner, ctx);
    case 'item':      return renderList(pickOne(ctx.menuItems, attrs), attrs, inner, ctx);
    case 'categories': return renderCategories(ctx.menuItems, attrs, inner, ctx);

    case 'logo':        return renderLogo(ctx, attrs);
    case 'brand-name':  return esc(ctx.brand?.brand_name || "Mimi's Pizza & Burger");
    case 'tagline':     return esc(ctx.brand?.brand_tagline || '');

    case 'phone':    return renderPhone(ctx, attrs);
    case 'address':  return esc(locationOf(ctx, attrs)?.display_address || '');
    case 'hours':    return renderHours(ctx, attrs);

    case 'add-to-cart':     return renderAddToCart(attrs, inner, ctx);
    case 'cart-count':      return `<span data-mimis-cart-count>0</span>`;
    case 'cart-total':      return `<span data-mimis-cart-total>${esc(formatPrice(0))}</span>`;
    case 'checkout-button': return `<a href="/cart"${cls(attrs)}>${inner || 'Checkout'}</a>`;

    // Unknown embed: leave the original markup in place so the mistake is
    // visible to whoever wrote it, rather than silently disappearing.
    default: return original;
  }
}

/* ------------------------------------------------------------ selection */

// Attribute values arrive still entity-encoded (parseAttrs does no decoding),
// so a category written as category="Sub/Sandwiches 8&quot;" must be decoded
// before it can be compared with the raw name held in the database.
function decodeAttr(s) {
  return String(s ?? '')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function pickByCategory(items, attrs) {
  const wanted = decodeAttr(attrs.category || '').trim().toLowerCase();
  let list = items.filter((i) => (i.category || '').trim().toLowerCase() === wanted);
  // `with-image`: only items that have a photo. Homepage showcase grids use
  // this — Clover has whole categories with no photos, and a marketing grid
  // full of broken-image icons is worse than showing fewer items.
  if ('with-image' in attrs) list = list.filter((i) => i.image_url);
  if (attrs.sort === 'price') list = [...list].sort((a, b) => a.price_cents - b.price_cents);
  if (attrs.sort === 'price-desc') list = [...list].sort((a, b) => b.price_cents - a.price_cents);
  if (attrs.sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  const limit = Number(attrs.limit);
  return limit > 0 ? list.slice(0, limit) : list;
}

function pickByIds(items, attrs) {
  const ids = (attrs.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
  return ids.map((id) => items.find((i) => i.id === id)).filter(Boolean);
}

function pickOne(items, attrs) {
  const found = items.find((i) => i.id === (attrs.id || '').trim());
  return found ? [found] : [];
}

/* -------------------------------------------------------------- rendering */

// If the author supplied a <template>, repeat THEIR markup per item. This is
// what lets any pasted design show live menu data without inheriting our CSS.
function renderList(items, attrs, inner, ctx) {
  if (!items.length) return '';
  const tpl = extractTemplate(inner);

  if (tpl) {
    return items.map((item) => fillTokens(tpl, item, ctx)).join('\n');
  }

  const cols = attrs.columns || '3';
  const cards = items.map((item) => `
    <article class="mimis-card" data-mimis-item="${esc(item.id)}">
      ${item.image_url ? `<img class="mimis-card-img" src="${esc(item.image_url)}" alt="${esc(displayName(item.name))}" loading="lazy">` : ''}
      <h3 class="mimis-card-title">${esc(displayName(item.name))}</h3>
      ${item.description_override ? `<p class="mimis-card-desc">${esc(item.description_override)}</p>` : ''}
      <div class="mimis-card-foot">
        ${attrs['hide-price'] === undefined ? `<span class="mimis-price">${esc(formatPrice(item.price_cents))}</span>` : ''}
        ${addButton(item, attrs['button-label'] || 'Add to order', 'mimis-btn')}
      </div>
    </article>`).join('');

  return `<div class="mimis-grid" style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(${cols === '2' ? '260' : cols === '4' ? '180' : '220'}px,1fr))">${cards}</div>`;
}

// Balanced extraction, not a lazy regex.
//
// A <mimis-categories> template legitimately contains a <mimis-menu> with its
// OWN <template>. A non-greedy /<template>([\s\S]*?)<\/template>/ stops at the
// inner closing tag, truncating the outer template mid-markup -- which left an
// unclosed <mimis-menu> that the embed matcher could then never match, so the
// tag survived as literal text on the page. Count depth instead.
function extractTemplate(inner) {
  const s = String(inner || '');
  const open = s.search(/<template[^>]*>/i);
  if (open === -1) return null;

  const tagRe = /<template[^>]*>|<\/template\s*>/gi;
  tagRe.lastIndex = open;

  let depth = 0;
  let m;
  while ((m = tagRe.exec(s))) {
    const isClose = m[0][1] === '/';
    depth += isClose ? -1 : 1;
    if (depth === 0) {
      const contentStart = open + s.slice(open).match(/<template[^>]*>/i)[0].length;
      return s.slice(contentStart, m.index);
    }
  }
  return null; // unbalanced: treat as no template rather than guessing
}

function fillTokens(tpl, item, ctx) {
  // Field names match the real mimis.menu_items columns: description lives in
  // description_override, the badge in badge_text. {{name}} goes through
  // displayName so Clover's "16. Meat Lovers Pizza"-style ordering prefixes
  // never reach a customer-facing page (same rule the React shop pages use).
  const map = {
    id: item.id,
    // Product page is keyed by clover_item_id, not the internal uuid -- {{url}}
    // exists so a theme can make the whole card open the item without the
    // designer needing to know that distinction.
    url: item.clover_item_id ? `/menu/${item.clover_item_id}` : '/menu',
    clover_id: item.clover_item_id || '',
    name: displayName(item.name),
    raw_name: item.name,
    description: item.description_override || item.description || '',
    price: formatPrice(item.price_cents),
    price_cents: String(item.price_cents),
    image: item.image_url || '',
    video: item.video_url || '',
    category: item.category || '',
    badge: item.badge_text || '',
    available: item.available ? 'true' : 'false',
  };
  let out = tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => esc(map[k] ?? ''));
  // Nested embeds inside a template (commonly <mimis-add-to-cart item="{{id}}">)
  return renderEmbeds(out, ctx);
}

function renderCategories(items, attrs, inner, ctx) {
  // Decoded for the same reason as `category` on <mimis-menu>: these name real
  // categories, and several of Mimi's contain a double quote.
  const exclude = decodeAttr(attrs.exclude || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const seen = [];
  for (const i of items) {
    const c = (i.category || '').trim();
    if (c && !seen.includes(c) && !exclude.includes(c.toLowerCase())) seen.push(c);
  }
  // `order`: comma-separated category names to pin to the front. Anything not
  // listed keeps its natural order behind them, so a new Clover category still
  // appears on its own without anyone editing the theme -- which is the whole
  // reason a menu page is built from this rather than a fixed list of sections.
  const pinned = decodeAttr(attrs.order || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (pinned.length) {
    const rank = (c) => {
      const i = pinned.findIndex((p) => p.toLowerCase() === c.toLowerCase());
      return i === -1 ? pinned.length : i;
    };
    seen.sort((a, b) => rank(a) - rank(b));
  } else {
    // Default to the same CATEGORY_ORDER the real /menu page sorts by. Without
    // this a theme menu would list categories in whatever order Clover happened
    // to sync them, and the two menu pages would disagree about what comes
    // first -- confusing on a site where both are reachable.
    seen.sort((a, b) => categorySortIndex(a) - categorySortIndex(b));
  }

  const limit = Number(attrs.limit);
  const list = limit > 0 ? seen.slice(0, limit) : seen;

  const tpl = extractTemplate(inner);
  if (tpl) {
    return list.map((c, idx) => {
      // Category tokens are deliberately NOT called {{name}}: this template
      // usually wraps a <mimis-menu> whose own template uses {{name}} for the
      // item. Sharing the token would stamp the category name over every item
      // name before the inner embed ever ran.
      //
      // {{cat}} is escaped for display; {{cat_attr}} is attribute-safe, so
      // category="{{cat_attr}}" still matches a category containing a double
      // quote -- Clover has several, e.g. `Sub/Sandwiches 8"`.
      // {{cat}} is the customer-facing label, so "Uncategorized" shows as
      // "More Favorites" exactly as it does on the real menu page. {{cat_attr}}
      // stays the raw Clover name because that is what has to match a lookup.
      const filled = tpl
        .replace(/\{\{\s*cat_attr\s*\}\}/g, attrSafe(c))
        .replace(/\{\{\s*cat_raw\s*\}\}/g, esc(c))
        .replace(/\{\{\s*cat\s*\}\}/g, esc(displayCategory(c)))
        .replace(/\{\{\s*index\s*\}\}/g, String(idx + 1))
        .replace(/\{\{\s*number\s*\}\}/g, String(idx + 1).padStart(2, '0'))
        .replace(/\{\{\s*slug\s*\}\}/g, slugify(c));
      // Recurse so a <mimis-menu category="{{name_attr}}"> inside the template
      // actually renders. Without this the tag survives as literal markup.
      return renderEmbeds(filled, ctx);
    }).join('\n');
  }
  return `<ul class="mimis-categories">${list.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`;
}

function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/["']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Only quotes and ampersands need encoding inside a double-quoted attribute.
// Kept separate from esc() so the value round-trips back through parseAttrs.
function attrSafe(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function renderAddToCart(attrs, inner, ctx) {
  const item = ctx.menuItems.find((i) => i.id === (attrs.item || '').trim());
  if (!item) return '';
  return addButton(item, inner || 'Add to order', attrs.class || '', attrs.qty);
}

// The payload carries everything the cart needs, so the click handler never has
// to look anything up -- which is what makes this work on a fully static page.
function addButton(item, label, className = '', qty) {
  const payload = {
    clover_item_id: item.clover_item_id,
    name: item.name,
    price_cents: item.price_cents,
    quantity: Number(qty) > 0 ? Number(qty) : 1,
    image_url: item.image_url || null,
    modifiers: [],
    special_instructions: '',
  };
  return `<button type="button"${className ? ` class="${esc(className)}"` : ''} data-mimis-add="${esc(JSON.stringify(payload))}">${label}</button>`;
}

function renderLogo(ctx, attrs) {
  const url = ctx.brand?.logo_url;
  if (!url) return '';
  const alt = ctx.brand?.brand_name || "Mimi's";
  // One class attribute only. This previously emitted cls(attrs) AND a class=
  // of its own, so any <mimis-logo class="..."> produced an <img> with two
  // class attributes -- invalid HTML that browsers resolve by silently keeping
  // the first, which made sizing classes look like they applied at random.
  return `<img src="${esc(url)}" alt="${esc(alt)}" class="${esc(attrs.class || 'mimis-logo')}">`;
}

function renderPhone(ctx, attrs) {
  const loc = locationOf(ctx, attrs);
  const phone = loc?.display_phone || loc?.phone;
  if (!phone) return '';
  return `<a href="tel:${esc(phone.replace(/[^\d+]/g, ''))}"${cls(attrs)}>${esc(phone)}</a>`;
}

function renderHours(ctx, attrs) {
  const loc = locationOf(ctx, attrs);
  const rows = (ctx.hours || []).filter((h) => h.location === loc?.location);
  if (!rows.length) return '';
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date().getDay();
  const byDay = new Map();
  for (const r of rows) {
    if (!byDay.has(r.weekday)) byDay.set(r.weekday, []);
    byDay.get(r.weekday).push(r);
  }
  const out = [];
  for (let d = 0; d < 7; d++) {
    const list = (byDay.get(d) || []).sort((a, b) => a.sort_order - b.sort_order);
    const text = !list.length || list.every((r) => r.closed)
      ? 'Closed'
      : list.filter((r) => !r.closed).map((r) => `${hhmm(r.opens_at)} – ${hhmm(r.closes_at)}`).join(', ');
    out.push(`<div class="mimis-hours-row${d === today ? ' is-today' : ''}"><span class="mimis-hours-day">${DAYS[d]}</span><span class="mimis-hours-time">${esc(text)}</span></div>`);
  }
  return `<div class="mimis-hours">${out.join('')}</div>`;
}

function hhmm(t) {
  if (!t) return '';
  const [h, m] = String(t).split(':');
  const hour = Number(h);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return m && m !== '00' ? `${h12}:${m}${suffix}` : `${h12}${suffix}`;
}

function locationOf(ctx, attrs) {
  const wanted = (attrs.location || '').trim().toLowerCase();
  const locs = ctx.locations || [];
  if (wanted) return locs.find((l) => l.location.toLowerCase() === wanted) || null;
  return locs[0] || null;
}

function cls(attrs) {
  return attrs.class ? ` class="${esc(attrs.class)}"` : '';
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
