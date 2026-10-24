'use client';

import Link from 'next/link';
import { EMAIL_CONSENT_TEXT } from '@/lib/emailConsent';

// Unchecked by default, never required, separate from anything else on the
// form (consent rules: marketing must be a free, separate choice). Shown only
// once an email address has been typed.
export default function EmailOptIn({ checked, onChange, className = '' }) {
  return (
    <label className={`flex items-start gap-2.5 text-xs text-app-soft cursor-pointer select-none ${className}`}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
      />
      <span>
        {EMAIL_CONSENT_TEXT}{' '}
        <Link href="/privacy" className="underline hover:text-app" target="_blank">Privacy</Link>
      </span>
    </label>
  );
}
