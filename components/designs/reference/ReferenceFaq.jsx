'use client';
import { useState } from 'react';

// The reference used shadcn's <Accordion>. Same behaviour, no new dependency:
// one item open at a time, click the open one to close it.

export default function ReferenceFaq({ items }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="space-y-4">
      {items.map((faq, idx) => {
        const isOpen = open === idx;
        return (
          <div key={faq.q} className="border-b border-[rgba(29,32,33,0.1)] dark:border-white/10 px-2">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : idx)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 text-left py-6 text-[#1D2021] dark:text-[#f5ebd7] hover:text-[#C8102E] dark:hover:text-[#e6b95c] transition-colors"
            >
              <span className="text-xl md:text-2xl font-bold font-serif">{faq.q}</span>
              <svg
                className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {isOpen && (
              <div className="text-[#3D4041] dark:text-[#f5ebd7]/70 text-base leading-relaxed pb-6 pr-12">
                {faq.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
