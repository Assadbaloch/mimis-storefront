'use client';
import { useEffect, useRef, useState } from 'react';
import CategoryPills from '@/components/CategoryPills';
import MenuItemCard from '@/components/MenuItemCard';

export default function MenuBrowser({ groups }) {
  const [active, setActive] = useState(groups[0]?.key);
  const sectionRefs = useRef({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.dataset.key);
        });
      },
      { rootMargin: '-140px 0px -70% 0px', threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [groups]);

  function handleSelect(key) {
    setActive(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <CategoryPills
        categories={groups.map((g) => ({ key: g.key, label: g.label }))}
        active={active}
        onSelect={handleSelect}
      />
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 space-y-20">
        {groups.map((group, idx) => (
          <section
            key={group.key}
            data-key={group.key}
            ref={(el) => (sectionRefs.current[group.key] = el)}
            className="scroll-mt-40"
          >
            <div className="mb-7">
              <p className="text-gold/70 font-serif text-sm tracking-widest">{String(idx + 1).padStart(2, '0')} / {group.label.toUpperCase()}</p>
              <h2 className="font-serif font-bold text-3xl text-cream mt-1">{group.label}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
              {group.items.map((item) => (
                <MenuItemCard key={item.clover_item_id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
