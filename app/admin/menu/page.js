'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { GuidePanel } from '@/components/admin/Guide';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { displayCategory, categorySortIndex } from '@/lib/format';
import AdminProductEditor from '@/components/AdminProductEditor';

// Menu editor, rebuilt 2026-08-10 around canonical products.
//
// Before: one card per mimis.menu_items row. Because that table is one row per
// (location, Clover item), every product both restaurants carry appeared twice
// and had to have its photo and description uploaded twice -- and the two
// copies could silently drift apart.
//
// Now: one card per mimis.menu_products row, with the locations that carry it
// listed on the card. Editing writes once and a database trigger fans it out
// to every location (unless that location has explicitly opted out).
//
// The list is split so the difference between the restaurants is visible
// rather than hidden: products both stores carry, then each store's exclusives.

export default function AdminMenuPage() {
  const [products, setProducts] = useState([]);
  const [itemsByProduct, setItemsByProduct] = useState({});
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [scope, setScope] = useState('all');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const supabase = getSupabasePublicClient();
    const [{ data: productRows, error: productErr }, { data: itemRows, error: itemErr }] = await Promise.all([
      supabase.from('menu_products').select('*').order('name', { ascending: true }),
      supabase
        .from('menu_items')
        .select('id, product_id, location, name, category, price_cents, available, editorial_override')
        .order('location', { ascending: true }),
    ]);

    if (productErr || itemErr) {
      setError(productErr?.message || itemErr?.message || 'Could not load the menu.');
      setLoading(false);
      return;
    }

    const grouped = {};
    for (const item of itemRows || []) {
      if (!item.product_id) continue;
      (grouped[item.product_id] ||= []).push(item);
    }

    setProducts(productRows || []);
    setItemsByProduct(grouped);
    setLocations(Array.from(new Set((itemRows || []).map((i) => i.location))).sort());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // A product has no category of its own -- category is Clover's, per location.
  // Use whatever the linked items say, which is the same value in practice.
  const categoryOf = useCallback(
    (productId) => {
      const items = itemsByProduct[productId] || [];
      return (items[0]?.category || '').trim() || 'Uncategorized';
    },
    [itemsByProduct]
  );

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => categoryOf(p.id)));
    return Array.from(set).sort((a, b) => categorySortIndex(a) - categorySortIndex(b));
  }, [products, categoryOf]);

  const filtered = products.filter((p) => {
    const items = itemsByProduct[p.id] || [];
    if (!items.length) return false; // product exists but nothing carries it
    if (category !== 'all' && categoryOf(p.id) !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (scope === 'shared' && items.length < 2) return false;
    // Photos that only one restaurant benefits from. These are usually a dish
    // Clover lists twice under an old and a new name, with the photo stuck on
    // the retired one -- exactly what "Same as another item…" is for.
    if (scope === 'stranded_photos') {
      if (!p.image_url) return false;
      if (new Set(items.map((i) => i.location)).size > 1) return false;
    }
    if (scope === 'missing_photos') {
      if (p.image_url) return false;
      if (new Set(items.map((i) => i.location)).size < 2) return false;
    }
    if (!['all', 'shared', 'stranded_photos', 'missing_photos'].includes(scope)) {
      const only = items.length === 1 && items[0].location === scope;
      if (!only) return false;
    }
    return true;
  });

  const shared = filtered.filter((p) => (itemsByProduct[p.id] || []).length > 1);
  const exclusives = locations.map((loc) => ({
    location: loc,
    products: filtered.filter((p) => {
      const items = itemsByProduct[p.id] || [];
      return items.length === 1 && items[0].location === loc;
    }),
  }));

  if (loading) return <p className="text-center text-cream/50 py-24">Loading menu…</p>;
  if (error) return <p className="text-center text-brick py-24">{error}</p>;

  function renderGroup(list) {
    return (
      <div className="space-y-3">
        {list.map((p) => (
          <AdminProductEditor key={p.id} product={p} items={itemsByProduct[p.id] || []}
            allProducts={products} onChanged={load} />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <h1 className="font-serif font-bold text-3xl text-cream mb-2">Menu Editor</h1>
      <p className="text-cream/55 text-sm mb-4">
        Add photos, a description, a badge, featured status or display order once — it applies to every
        restaurant that carries the item. Price, name, category and availability always come from Clover,
        per location, and can&rsquo;t be changed here.
      </p>

      <GuidePanel title="How this screen works" defaultOpen={false}>
        <p>
          <strong>One card per product.</strong> If both restaurants sell it you get a single card —
          the line under the name tells you how many locations your edit will update.
        </p>
        <p>
          <strong>The small pills</strong> show each restaurant&rsquo;s price and availability. Those
          come from Clover and are read-only. Click <strong>shared</strong> / <strong>own</strong> on
          a pill to let one restaurant keep its own picture instead of the common one.
        </p>
        <p>
          <strong>Manage media</strong> takes several files at once. Drag the thumbnails to reorder —
          the first is the cover shown in the menu grid, the rest become a gallery.
        </p>
        <p>
          <strong>Photo at one restaurant but not the other?</strong> The dish is probably listed
          twice in Clover under different names. Use the ⚠ filters above, then{' '}
          <strong>Same as another item…</strong> on the card to merge them.
        </p>
        <p>
          Photos save as soon as they upload; everything else needs the <strong>Save</strong> button
          on that card. <Link href="/admin/help#menu" className="text-gold/80 hover:text-gold">Full guide →</Link>
        </p>
      </GuidePanel>

      <div className="flex flex-wrap gap-3 mb-6">
        <input placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} className="input flex-1 min-w-[180px]" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{displayCategory(c)}</option>
          ))}
        </select>
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="input">
          <option value="all">All locations</option>
          <option value="shared">Shared by all</option>
          <option value="stranded_photos">⚠ Photos only one location sees</option>
          <option value="missing_photos">⚠ Shared items with no photo</option>
          {locations.map((l) => (
            <option key={l} value={l}>Only at {l}</option>
          ))}
        </select>
      </div>

      {scope === 'stranded_photos' && (
        <p className="text-cream/50 text-xs mb-4 leading-relaxed rounded-xl border border-cream/12 bg-cream/[0.03] p-3">
          These items have a photo but are only carried by one restaurant — so the other one shows
          nothing. Usually the same dish exists twice in Clover under an old and a new name, with the
          photo stuck on the retired one. Open <strong>Same as another item…</strong> on each and
          merge it into the name you actually sell under; the photo moves and both locations get it.
        </p>
      )}
      {scope === 'missing_photos' && (
        <p className="text-cream/50 text-xs mb-4 leading-relaxed rounded-xl border border-cream/12 bg-cream/[0.03] p-3">
          Both restaurants carry these, but there&rsquo;s no photo. Either upload one here, or check
          the <strong>Photos only one location sees</strong> filter — the picture may already exist
          on a duplicate entry waiting to be merged in.
        </p>
      )}

      {shared.length > 0 && (
        <section className="mb-10">
          <h2 className="text-cream/80 text-xs font-bold uppercase tracking-wider mb-1">
            Carried by every location · {shared.length}
          </h2>
          <p className="text-cream/40 text-[11px] mb-3">Edit once here and both restaurants update together.</p>
          {renderGroup(shared)}
        </section>
      )}

      {exclusives.map(({ location, products: list }) =>
        list.length > 0 ? (
          <section key={location} className="mb-10">
            <h2 className="text-cream/80 text-xs font-bold uppercase tracking-wider mb-1">
              Only at {location} · {list.length}
            </h2>
            <p className="text-cream/40 text-[11px] mb-3">Not on the other restaurant&rsquo;s Clover menu.</p>
            {renderGroup(list)}
          </section>
        ) : null
      )}

      {filtered.length === 0 && <p className="text-cream/40 text-sm py-10 text-center">No items match.</p>}
    </div>
  );
}
