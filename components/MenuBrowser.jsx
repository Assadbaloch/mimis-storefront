'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CategoryPills from '@/components/CategoryPills';
import MenuItemCard from '@/components/MenuItemCard';
import { displayName } from '@/lib/format';

// Navigation is responsive in structure, not just in size:
//   * desktop (lg+): a sticky sidebar lists every category with live counts and
//     scroll-spy highlighting — any section is one click away at all times.
//   * mobile/tablet: the horizontal pill bar (thumb-swipeable) stays, since a
//     sidebar would steal half a phone screen.
// Both share the same `active` scroll-spy state and the same select handler.
export default function MenuBrowser({ groups }) {
  const searchParams = useSearchParams();
  // Deep-link target -- e.g. /menu?item=<clover_item_id> from the rewards-page
  // trending banner ("direct the customer to the product itself"). Scrolls to
  // the right category and auto-opens that item's modal once on arrival.
  const targetItemId = searchParams.get('item');
  // Deep-link target -- e.g. /menu?category=Burgers from the header's category
  // dropdown/accordion. Scrolls straight to that category's section on arrival.
  const targetCategory = searchParams.get('category');
  const [active, setActive] = useState(groups[0]?.key);
  const [query, setQuery] = useState('');
  const sectionRefs = useRef({});
  // Track the *last* item/category actually scrolled to (not just "have we
  // ever scrolled") -- a one-shot boolean lock would only ever honor the
  // first deep link of a visit and silently ignore every link clicked after
  // it, which is exactly what looked like categories "doing nothing."
  const lastScrolledItemId = useRef(null);
  const lastScrolledCategory = useRef(null);

  // requestAnimationFrame alone can fire before menu-item images finish
  // loading and shift section heights, leaving the scroll short of the real
  // target. Re-running once more shortly after corrects for that drift.
  function scrollToGroup(key) {
    setActive(key);
    const run = () => sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    requestAnimationFrame(run);
    setTimeout(run, 400);
  }

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
  }, [groups, searchResults]);

  useEffect(() => {
    if (!targetItemId || lastScrolledItemId.current === targetItemId) return;
    const group = groups.find((g) => g.items.some((i) => i.clover_item_id === targetItemId));
    if (!group) return;
    lastScrolledItemId.current = targetItemId;
    scrollToGroup(group.key);
  }, [targetItemId, groups]);

  useEffect(() => {
    if (!targetCategory || lastScrolledCategory.current === targetCategory) return;
    const group = groups.find((g) => g.key.toLowerCase() === targetCategory.toLowerCase());
    if (!group) return;
    lastScrolledCategory.current = targetCategory;
    scrollToGroup(group.key);
  }, [targetCategory, groups]);

  // Selecting a category always lands on that section — including mid-search,
  // where the sections aren't mounted until the query is cleared. Clearing
  // first and letting scrollToGroup's delayed retry find the re-mounted
  // section handles that without any extra state.
  function handleSelect(key) {
    if (searchResults) setQuery('');
    scrollToGroup(key);
  }

  const searchBox = (
    <div className="relative">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-app-faint">
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
          className="absolute right-3 top-1/2 -translate-y-1/2 text-app-faint hover:text-app-soft text-sm"
        >
          ✕
        </button>
      )}
    </div>
  );

  const resultsView = (
    <div className="py-10">
      <p className="text-app-faint text-sm mb-6">
        {searchResults?.length === 0
          ? `No menu items match "${query.trim()}".`
          : `${searchResults?.length} result${searchResults?.length === 1 ? '' : 's'} for "${query.trim()}"`}
      </p>
      {searchResults?.length > 0 ? (
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
  );

  const sectionsView = (
    <div className="py-12 space-y-20">
      {groups.map((group, idx) => (
        <section
          key={group.key}
          data-key={group.key}
          ref={(el) => (sectionRefs.current[group.key] = el)}
          className="scroll-mt-52 lg:scroll-mt-28"
        >
          <div className="mb-7">
            <p className="text-highlight font-serif text-sm tracking-widest">{String(idx + 1).padStart(2, '0')} / {group.label.toUpperCase()}</p>
            <h2 className="font-serif font-bold text-3xl text-app mt-1">{group.label}</h2>
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
  );

  return (
    <>
      {/* Mobile / tablet: swipeable sticky pill bar with search. */}
      <div className="lg:hidden">
        <CategoryPills
          categories={groups.map((g) => ({ key: g.key, label: g.label }))}
          active={active}
          onSelect={handleSelect}
          searchSlot={searchBox}
          hidePills={!!searchResults}
        />
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:grid lg:grid-cols-[240px,1fr] lg:gap-10 lg:items-start">
        {/* Desktop: sticky category sidebar — search on top, every section one
            click away, active section highlighted by the shared scroll-spy. */}
        <aside className="hidden lg:block sticky top-24 max-h-[calc(100vh-7.5rem)] overflow-y-auto no-scrollbar py-8 pr-1">
          <div className="mb-5">{searchBox}</div>
          <p className="section-label mb-3">Categories</p>
          <nav aria-label="Menu categories" className="space-y-1">
            {groups.map((g) => {
              const isActive = !searchResults && active === g.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => handleSelect(g.key)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex w-full items-center justify-between gap-2 text-left px-3.5 py-2.5 rounded-app-sm text-sm font-semibold border-l-2 transition-colors ${
                    isActive
                      ? 'border-highlight bg-highlight-wash text-highlight'
                      : 'border-transparent text-app-soft hover:text-app hover:bg-app-wash'
                  }`}
                >
                  <span className="truncate">{g.label}</span>
                  <span className={`text-[11px] font-bold tabular-nums shrink-0 ${isActive ? 'text-highlight' : 'text-app-faint'}`}>
                    {g.items.length}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          {searchResults ? resultsView : sectionsView}
        </div>
      </div>
    </>
  );
}
