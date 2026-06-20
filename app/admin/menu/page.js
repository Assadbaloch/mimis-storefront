'use client';
import { useEffect, useMemo, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { displayCategory, categorySortIndex } from '@/lib/format';
import AdminItemEditor from '@/components/AdminItemEditor';

export default function AdminMenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    const supabase = getSupabasePublicClient();
    supabase
      .from('menu_items')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setItems(data || []);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => (i.category || '').trim() || 'Uncategorized'));
    return Array.from(set).sort((a, b) => categorySortIndex(a) - categorySortIndex(b));
  }, [items]);

  const filtered = items.filter((i) => {
    const cat = (i.category || '').trim() || 'Uncategorized';
    if (category !== 'all' && cat !== category) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <p className="text-center text-cream/50 py-24">Loading menu…</p>;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <h1 className="font-serif font-bold text-3xl text-cream mb-2">Menu Editor</h1>
      <p className="text-cream/55 text-sm mb-6">
        Add photos, a custom description, a badge, featured status, or display order. Price, name,
        category, and availability always come from Clover and can&rsquo;t be changed here.
      </p>

      <div className="flex gap-3 mb-6">
        <input placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} className="input flex-1" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{displayCategory(c)}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((item) => (
          <AdminItemEditor key={item.id} item={item} />
        ))}
        {filtered.length === 0 && (
          <p className="text-cream/40 text-sm py-10 text-center">No items match.</p>
        )}
      </div>
    </div>
  );
}
