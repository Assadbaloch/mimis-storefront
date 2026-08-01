import { formatPrice, displayName } from '@/lib/format';

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

const PAIRED = /<mimis-([a-z-]+)((?:\s+[^>]*?)?)>([\s\S]*?)<\/mimis-\1\s*>/gi;
const SELF_CLOSING = /<mimis-([a-z-]+)((?:\s+[^>]*?)?)\/>/gi;

export function renderEmbeds(html, ctx) {
  if (!html) return '';
  let out = String(html);

  // Paired first (they may contain a <template>), then self-closing.
  out = out.replace(PAIRED, (match, name, attrString, inner) =>
    renderOne(name.toLowerCase(), parseAttrs(attrString), inner, ctx, match));

  out = out.replace(SELF_CLOSING, (match, name, attrString) =>
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
    case 'categories': return renderCategories(ctx.menuItems, attrs, inner);

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

function pickByCategory(items, attrs) {
  const wanted = (attrs.category || '').trim().toLowerCase();
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

function extractTemplate(inner) {
  const m = String(inner || '').match(/<template[^>]*>([\s\S]*?)<\/template>/i);
  return m ? m[1] : null;
}

function fillTokens(tpl, item, ctx) {
  // Field names match the real mimis.menu_items columns: description lives in
  // description_override, the badge in badge_text. {{name}} goes through
  // displayName so Clover's "16. Meat Lovers Pizza"-style ordering prefixes
  // never reach a customer-facing page (same rule the React shop pages use).
  const map = {
    id: item.id,
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

function renderCategories(items, attrs, inner) {
  const exclude = (attrs.exclude || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const seen = [];
  for (const i of items) {
    const c = (i.category || '').trim();
    if (c && !seen.includes(c) && !exclude.includes(c.toLowerCase())) seen.push(c);
  }
  const tpl = extractTemplate(inner);
  if (tpl) return seen.map((c) => tpl.replace(/\{\{\s*name\s*\}\}/g, esc(c))).join('\n');
  return `<ul class="mimis-categories">${seen.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`;
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
  return `<img src="${esc(url)}" alt="${esc(alt)}"${cls(attrs)} class="${esc(attrs.class || 'mimis-logo')}">`;
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
