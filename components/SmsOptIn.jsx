'use client';

import Link from 'next/link';
import { SMS_TXN_TEXT, SMS_MKT_TEXT, SMS_LINK_TAIL } from '@/lib/smsConsent';

// The two SMS consent boxes (A2P 10DLC). Used at checkout, rewards sign-up and
// in the website chat, with identical wording everywhere. Both unchecked by
// default and never required. The bold first sentence is the box label; the
// rest is the disclosure carriers require next to the box.
function Box({ text, checked, onChange, id }) {
  const body = text.slice(0, text.length - SMS_LINK_TAIL.length).trimEnd();
  const dot = body.indexOf('. ');
  const lead = body.slice(0, dot + 1);
  const rest = body.slice(dot + 2);
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 text-[11px] leading-snug text-app-soft cursor-pointer select-none">
      <input
        id={id}
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
      />
      <span>
        <span className="font-semibold text-app">{lead}</span>{' '}{rest}{' '}
        See our{' '}
        <Link href="/terms" target="_blank" className="underline hover:text-app">Terms</Link>
        {' '}and{' '}
        <Link href="/privacy" target="_blank" className="underline hover:text-app">Privacy Policy</Link>.
      </span>
    </label>
  );
}

export default function SmsOptIn({ txn, mkt, onTxn, onMkt, idPrefix = 'sms', className = '' }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      <Box id={`${idPrefix}-txn`} text={SMS_TXN_TEXT} checked={txn} onChange={onTxn} />
      <Box id={`${idPrefix}-mkt`} text={SMS_MKT_TEXT} checked={mkt} onChange={onMkt} />
    </div>
  );
}
