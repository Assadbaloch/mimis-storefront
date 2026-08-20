'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveContact } from '@/lib/customer';

// The reference rendered these four pills with no click handler at all -- they
// looked interactive and did nothing.
//
// Only two of them are real order types. app/checkout accepts 'pickup' or
// 'delivery' and nothing else, so those two persist the choice through
// saveContact(), which checkout already reads on load. Dine-in and catering
// are not online order types: dine-in needs no order at all, and catering is an
// enquiry. Wiring those two to an order_type would send checkout a value it
// rejects, so they do what they actually mean instead.

const MODES = [
  { id: 'pickup', label: 'Pickup', kind: 'order', note: 'Pickup selected. Your order will be ready at the counter — usually about 20 minutes.' },
  { id: 'delivery', label: 'Delivery', kind: 'order', note: 'Delivery selected. We deliver within 8-10 miles; further out depends on availability.' },
  { id: 'dine-in', label: 'Dine-In', kind: 'info', note: 'Seating is limited at both kitchens — walk in any time, no online order needed.' },
  { id: 'catering', label: 'Catering', kind: 'enquiry', note: 'Catering is arranged by hand. Send us the date, headcount and location using the form below.' },
];

export default function OrderModeTabs({ formAnchor = 'get-in-touch' }) {
  const [selected, setSelected] = useState('pickup');
  const router = useRouter();
  const active = MODES.find((m) => m.id === selected) || MODES[0];

  function choose(mode) {
    setSelected(mode.id);

    if (mode.kind === 'order') {
      // Persist only the order type; passing an empty form leaves any saved
      // contact details untouched.
      saveContact({}, mode.id);
      router.refresh();
    }

    if (mode.kind === 'enquiry') {
      document.getElementById(formAnchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 mb-12">
      <div className="inline-flex bg-[#EAE4D5] dark:bg-[#1a0f0a] border border-[rgba(29,32,33,0.1)] dark:border-white/10 rounded-full p-1 shadow-inner">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => choose(mode)}
            aria-pressed={selected === mode.id}
            className={`px-6 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase transition-colors ${
              selected === mode.id
                ? 'bg-[#C8102E] text-white dark:bg-[#e6b95c] dark:text-[#0a0604] shadow-sm'
                : 'text-[#5F625F] hover:text-[#1D2021] dark:text-[#f5ebd7]/60 dark:hover:text-[#f5ebd7]'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-[#3D4041] dark:text-[#f5ebd7]/70 text-center max-w-md min-h-[2.5rem]">
        {active.note}
      </p>
    </div>
  );
}
