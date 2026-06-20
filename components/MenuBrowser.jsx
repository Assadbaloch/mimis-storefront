'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CategoryPills from '@/components/CategoryPills';
import MenuItemCard from '@/components/MenuItemCard';
import { displayName } from '@/lib/format';

export default function MenuBrowser({ groups }) {
  const searchParams = useSearchParams();
  // Deep-link target -- e.g. /menu?item=<clover_item_id> from the rewards-page
  // trending banner ("direct the customer to the product itself"). Scrolls to
  // the right category and auto-opens that item's modal once on arrival.
  const targetItemId = searchParams.get('item');
  const [active, setActive] = useState(groups[0]?.key);
  const [query, setQuery] = useState('');
  const sectionRefs = useRef({});
  const scrolledToTarget = useRef(false);

  // Flat, cross-category filter -- search isn't scoped to whichever category
  // tab happens to be active, it searches the whole menu at once. Matches on
  // the customer-facing name (Clover's "1.Mimi's Yummy Pizza"-style ordering
  // prefixes stripped first) plus the optional marketing description.
  const trimmedQuery = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return null;
    const results = [];
    for (const group of groups) {
      for (const item of group.items) {
        const name = displayName(item.name).toLowerCase();
        const desc = (item.description_override || '').toLowerCase();
        if (name.includes(trimmedQuery) || desc.includes(trimmedQuery)) results.push(item);
      }
    }
    return results;
  }, [trimmedQuery, groups]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.dataset.key);
        });
      },
      { rootMargin: '-200px 0px -70% 0px', threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [groups]);

  useEffect(() => {
    if (!targetItemId || scrolledToTarget.current) return;
    const group = groups.find((g) => g.items.some((i) => i.clover_item_id === targetItemId));
    if (!group) return;
    scrolledToTarget.current = true;
    setActive(group.key);
    requestAnimationFrame(() => {
      sectionRefs.current[group.key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [targetItemId, groups]);

  function handleSelect(key) {
    setActive(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const searchBox = (
    <div className="relative">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(245,235,215,0.4)" strokeWidth="2"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="search"
        inputMode="search"
        placeholder="Search the menu…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input w-full !pl-10 !pr-9"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40 hover:text-cream/70 text-sm"
        >
          ✕
        </button>
      )}
    </div>
  );

  return (
    <>
      <CategoryPills
        categories={groups.map((g) => ({ key: g.key, label: g.label }))}
        active={active}
        onSelect={handleSelect}
        searchSlot={searchBox}
        hidePills={!!searchResults}
      />

      {searchResults ? (
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-10">
          <p className="text-cream/45 text-sm mb-6">
            {searchResults.length === 0
              ? `No menu items match "${query.trim()}".`
              : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'} for "${query.trim()}"`}
          </p>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
              {searchResults.map((item) => (
                <MenuItemCard key={item.clover_item_id} item={item} />
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => setQuery('')} className="btn-secondary">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 space-y-20">
          {groups.map((group, idx) => (
            <section
              key={group.key}
              data-key={group.key}
              ref={(el) => (sectionRefs.current[group.key] = el)}
              className="scroll-mt-52"
            >
              <div className="mb-7">
                <p className="text-gold/70 font-serif text-sm tracking-widest">{String(idx + 1).padStart(2, '0')} / {group.label.toUpperCase()}</p>
                <h2 className="font-serif font-bold text-3xl text-cream mt-1">{group.label}</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
                {group.items.map((item) => (
                  <MenuItemCard
                    key={item.clover_item_id}
                    item={item}
                    autoOpen={item.clover_item_id === targetItemId}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
