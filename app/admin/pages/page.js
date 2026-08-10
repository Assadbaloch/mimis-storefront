'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GuidePanel } from '@/components/admin/Guide';
import { getSupabasePublicClient } from '@/lib/supabaseClient';

// Pages manager: list, create, publish/unpublish, delete.
// Editing a page's sections happens in /admin/pages/[id].

export default function AdminPagesList() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await getSupabasePublicClient()
      .from('pages').select('*').order('sort_order').order('created_at');
    setPages(data || []);
    setLoading(false);
  }

  // Slug is derived from the title but stays editable afterwards, so staff
  // don't have to think about URLs to get started.
  function slugify(s) {
    return s.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    const slug = slugify(title);
    if (!slug) { setError('Give the page a title first.'); return; }
    setCreating(true);
    const { data, error: insErr } = await getSupabasePublicClient()
      .from('pages').insert({ slug, title: title.trim(), status: 'draft' }).select('id').single();
    setCreating(false);
    if (insErr) {
      // The DB rejects reserved slugs (/menu, /checkout…) and duplicates.
      setError(insErr.message.includes('reserved')
        ? `"${slug}" is reserved by the site. Try a different title.`
        : insErr.message.includes('duplicate')
          ? `A page with the address "/${slug}" already exists.`
          : insErr.message);
      return;
    }
    router.push(`/admin/pages/${data.id}`);
  }

  async function togglePublish(page) {
    const next = page.status === 'published' ? 'draft' : 'published';
    await getSupabasePublicClient().from('pages')
      .update({ status: next, updated_at: new Date().toISOString() }).eq('id', page.id);
    load();
  }

  async function remove(page) {
    if (!confirm(`Delete "${page.title}"? This removes the page and all its sections permanently.`)) return;
    await getSupabasePublicClient().from('pages').delete().eq('id', page.id);
    load();
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <h1 className="font-serif font-bold text-3xl text-cream mb-2">Pages</h1>
      <p className="text-cream/55 text-sm mb-4">
        Your home page, plus any extra pages you build. Each extra page gets its own web address
        under mimispizza.astrixshop.com.
      </p>

      <GuidePanel title="Start here" defaultOpen={false}>
        <p>
          <strong>Home page</strong> is your real, live home page, broken into blocks from top to
          bottom. Open it to reorder, edit, remove or add blocks — text, photos, videos, a slideshow,
          menu items, your locations and more.
        </p>
        <p>
          <strong>Your undo:</strong> untick <strong>Published</strong> on the Home page and the
          original built-in design comes straight back. Your blocks are kept, just not shown — tick
          it again to return to your version.
        </p>
        <p>
          A few addresses belong to the shop itself (<span className="font-mono">menu</span>,{' '}
          <span className="font-mono">cart</span>, <span className="font-mono">checkout</span>,{' '}
          <span className="font-mono">rewards</span>, <span className="font-mono">admin</span>) and
          can&rsquo;t be reused for your own pages.
        </p>
        <p>
          <Link href="/admin/help#pages" className="text-gold/80 hover:text-gold">
            Full guide, including what every block does →
          </Link>
        </p>
      </GuidePanel>

      <form onSubmit={handleCreate} className="flex gap-3 mb-8">
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="New page title, e.g. Catering"
          className="input flex-1" />
        <button type="submit" disabled={creating} className="btn-primary disabled:opacity-50">
          {creating ? 'Creating…' : 'Create Page'}
        </button>
      </form>
      {error && <p className="text-brick text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-cream/50 py-10 text-center">Loading…</p>
      ) : !pages.length ? (
        <p className="text-cream/50 py-10 text-center">No pages yet. Create your first one above.</p>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-cream/12 bg-cream/[0.03] px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-cream font-semibold truncate">{p.title}</span>
                  <span className={`badge text-[10px] px-2 py-0.5 rounded-full ${p.status === 'published' ? 'bg-gold/20 text-gold' : 'bg-cream/10 text-cream/50'}`}>
                    {p.status}
                  </span>
                </div>
                <span className="text-cream/45 text-xs">/{p.slug}</span>
              </div>
              {p.status === 'published' && (
                <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="text-cream/50 hover:text-cream text-xs">View ↗</a>
              )}
              <button onClick={() => togglePublish(p)} className="text-xs text-gold hover:underline">
                {p.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
              <Link href={`/admin/pages/${p.id}`} className="btn-primary text-xs px-3 py-1.5">Edit</Link>
              <button onClick={() => remove(p)} className="text-cream/40 hover:text-brick text-sm" title="Delete page">🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
