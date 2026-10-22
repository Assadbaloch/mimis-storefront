'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import MenuItemCard from '@/components/MenuItemCard';
import { displayName } from '@/lib/format';

// Navigation is responsive in structure, not just in size:
//   * desktop (lg+): a sticky sidebar lists every category with live counts and
//     scroll-spy highlighting — any section is one click away at all times.
//   * mobile/tablet: a slim sticky bar showing the CURRENT category plus a
//     menu button that opens a full category sheet. The old horizontal pill
//     strip was replaced because it took two rows of vertical space on every
//     phone screen and still hid most categories off the right edge.
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
  // After a store switch the sections change; an old key falls back to the first.
  const activeKey = groups.some((g) => g.key === active) ? active : groups[0]?.key;
  const [query, setQuery] = useState('');
  const sectionRefs = useRef({});
  // Track the *last* item/category actually scrolled to (not just "have we
  // ever scrolled") -- a one-shot boolean lock would only ever honor the
  // first deep link of a visit and silently ignore every link clicked after
  // it, which is exactly what looked like categories "doing nothing."
  const lastScrolledItemId = useRef(null);
  const lastScrolledCategory = useRef(null);
  const mobileBarRef = useRef(null);
  const chipsRef = useRef(null);
  // While a programmatic scroll is in flight the scroll-spy must not fight it:
  // passing over intervening sections would otherwise rewrite `active` and the
  // highlight would land somewhere other than what was tapped.
  const scrollLockRef = useRef(0);

  // scrollIntoView({block:'start'}) puts the section flush against the viewport
  // top, which parks it *behind* the sticky search bar -- so tapping "Burgers"
  // left the Burgers heading hidden and whatever follows it filling the screen.
  // Measuring the bar and scrolling to a computed offset is exact regardless of
  // how tall that bar happens to be at the current breakpoint.
  function scrollToGroup(key) {
    setActive(key);
    scrollLockRef.current = Date.now() + 900;
    const run = () => {
      const el = sectionRefs.current[key];
      if (!el) return;
      // offsetHeight is 0 when the bar is display:none (desktop), which is
      // correct there -- the sidebar is sticky but doesn't overlay content.
      // Everything that stays on screen above the section once scrolled: the
      // fixed header plus (phones) the sticky search/category bar.
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mimis-header-h')) || 80;
      const barH = mobileBarRef.current?.offsetHeight || 0;
      const top = window.scrollY + el.getBoundingClientRect().top - headerH - barH - 12;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    };
    // Re-run after layout settles: images finishing load shift section offsets,
    // and on mobile the body scroll-lock from the sheet is released a tick later.
    requestAnimationFrame(run);
    setTimeout(run, 260);
    setTimeout(run, 620);
  }

  // Flat, cross-category filter -- search isn't scoped to whichever category
  // tab happens to be active, it searches the whole menu at once. Matches on
  // the customer-facing name (Clover's "1.Mimi's Yummy Pizza"-style ordering
  // prefixes stripped first) plus the optional marketing description.
  const trimmedQuery = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return null;
    // Every word must appear somewhere in the dish: its name, description,
    // section or sizes ("bbq pizza", "wings", "large pepperoni"). A plural
    // also matches the singular ("wings" -> "wing"). Only the menu itself is
    // searched; nothing is added to it.
    const words = trimmedQuery.split(/\s+/).filter(Boolean);
    const results = [];
    for (const group of groups) {
      for (const item of group.items) {
        const hay = [
          displayName(item.name),
          item.description_override || '',
          group.label,
          ...(item.variants || []).map((v) => `${v.size_label} ${displayName(v.name)}`),
        ].join(' ').toLowerCase();
        const hit = words.every((w) => hay.includes(w) || (w.length > 3 && w.endsWith('s') && hay.includes(w.slice(0, -1))));
        if (hit) results.push(item);
      }
    }
    return results;
  }, [trimmedQuery, groups]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < scrollLockRef.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.dataset.key);
        });
      },
      // The band just under the header + sticky bar: the section crossing it
      // is the one being read. (A 4px band on short phones missed sections.)
      { rootMargin: '-220px 0px -45% 0px', threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [groups, searchResults]);

  useEffect(() => {
    if (!targetItemId || lastScrolledItemId.current === targetItemId) return;
    const group = groups.find((g) => g.items.some((i) => isTarget(i, targetItemId)));
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

  // Keep the active chip in view in the chip row (horizontal only -- never
  // scrolls the page).
  useEffect(() => {
    const row = chipsRef.current;
    if (!row || !activeKey) return;
    const chip = [...row.querySelectorAll('button')].find((b) => b.dataset.key === activeKey);
    if (!chip) return;
    const left = chip.offsetLeft - row.clientWidth / 2 + chip.offsetWidth / 2;
    row.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [activeKey]);


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
            <MenuItemCard key={item.group_key || item.clover_item_id} item={item} />
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
                key={item.group_key || item.clover_item_id}
                item={item}
                autoOpen={isTarget(item, targetItemId)}
                initialVariantId={item.variants && isTarget(item, targetItemId) ? targetItemId : null}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );

  return (
    <>
      {/* Phones and tablets: search + a row of category chips, stuck flush
          under the header (--mimis-header-h) on the header's own surface, so
          the two read as one bar. Replaces the "Viewing · X" line and the
          Menu button that opened a separate list. */}
      <div
        ref={mobileBarRef}
        className="mimis-subheader lg:hidden sticky z-40 border-b border-line backdrop-blur-md"
        style={{ top: 'var(--mimis-header-h, calc(5rem + var(--promo-bar-h, 0px)))' }}
      >
        <div className="px-4 md:px-8 pt-2.5 pb-2">{searchBox}</div>
        {!searchResults && (
          <nav
            ref={chipsRef}
            aria-label="Menu categories"
            className="flex gap-2 overflow-x-auto no-scrollbar px-4 md:px-8 pb-2.5 scroll-px-4"
          >
            {groups.map((g) => {
              const isActive = activeKey === g.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  data-key={g.key}
                  onClick={() => handleSelect(g.key)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold whitespace-nowrap border transition-colors ${
                    isActive ? 'bg-accent text-on-accent' : 'text-app-soft hover:text-app'
                  }`}
                  style={{ borderColor: isActive ? 'transparent' : 'var(--mimis-line)' }}
                >
                  {g.label}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:grid lg:grid-cols-[240px,1fr] lg:gap-10 lg:items-start">
        {/* Desktop: sticky category sidebar — search on top, every section one
            click away, active section highlighted by the shared scroll-spy. */}
        <aside
          className="hidden lg:block sticky overflow-y-auto no-scrollbar py-8 pr-1"
          style={{ top: 'var(--mimis-header-h, 6rem)', maxHeight: 'calc(100vh - var(--mimis-header-h, 6rem))' }}
        >
          <div className="mb-5">{searchBox}</div>
          <p className="section-label mb-3">Categories</p>
          <nav aria-label="Menu categories" className="space-y-1">
            {groups.map((g) => {
              const isActive = !searchResults && activeKey === g.key;
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

// A deep link names one Clover item; for a dish with sizes that is one of its
// variants, so the dish's card opens with that size picked.
function isTarget(item, id) {
  if (!id) return false;
  return item.clover_item_id === id || (Array.isArray(item.variants) && item.variants.some((v) => v.clover_item_id === id));
}
