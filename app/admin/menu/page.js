'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
    if (scope !== 'all' && scope !== 'shared') {
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
          <AdminProductEditor key={p.id} product={p} items={itemsByProduct[p.id] || []} onChanged={load} />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <h1 className="font-serif font-bold text-3xl text-cream mb-2">Menu Editor</h1>
      <p className="text-cream/55 text-sm mb-6">
        Add photos, a description, a badge, featured status or display order once — it applies to every
        restaurant that carries the item. Price, name, category and availability always come from Clover,
        per location, and can&rsquo;t be changed here.
      </p>

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
          {locations.map((l) => (
            <option key={l} value={l}>Only at {l}</option>
          ))}
        </select>
      </div>

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
