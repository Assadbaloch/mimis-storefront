'use client';

export default function CategoryPills({ categories, active, onSelect }) {
  return (
    <div className="sticky top-20 z-40 bg-ink/95 backdrop-blur-md border-b border-cream/10 -mx-5 px-5 md:-mx-8 md:px-8">
      <div className="max-w-6xl mx-auto flex gap-2.5 overflow-x-auto py-4 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`cat-pill ${active === cat.key ? 'active' : ''}`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
