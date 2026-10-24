'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Offer emails link here with ?e=<address>&t=<token>. One press stops offer
// emails to that address. Order receipts and order updates still arrive.
export default function UnsubscribeView() {
  const params = useSearchParams();
  const e = params.get('e') || '';
  const t = params.get('t') || '';
  const [state, setState] = useState('ready'); // ready | working | done | error
  const [message, setMessage] = useState('');

  async function unsubscribe() {
    setState('working');
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ e, t }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) { setState('done'); return; }
      setMessage(data.error || 'Something went wrong. Please try again.');
      setState('error');
    } catch {
      setMessage('Could not reach the server. Please check your connection and try again.');
      setState('error');
    }
  }

  const valid = e && t;
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-3">Email preferences</h1>
      {!valid && (
        <p className="text-app-soft">This link is incomplete. Please use the Unsubscribe link at the bottom of one of our emails.</p>
      )}
      {valid && state !== 'done' && (
        <>
          <p className="text-app-soft mb-6">
            Stop offers and news emails to <strong className="text-app break-all">{e}</strong>?
            You&rsquo;ll still get receipts and updates for orders you place.
          </p>
          <button onClick={unsubscribe} disabled={state === 'working'} className="btn-primary w-full justify-center !flex disabled:opacity-50">
            {state === 'working' ? 'Unsubscribing…' : 'Unsubscribe'}
          </button>
          {state === 'error' && <p className="text-danger text-sm mt-4">{message}</p>}
        </>
      )}
      {state === 'done' && (
        <>
          <p className="text-app-soft mb-6">Done. You won&rsquo;t get offer emails from us any more. Changed your mind? Tick the email box next time you order.</p>
          <Link href="/menu" className="btn-primary inline-flex justify-center">Back to the menu</Link>
        </>
      )}
    </div>
  );
}
