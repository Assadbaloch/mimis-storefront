'use client';
import { useEffect, useState } from 'react';
import { chatPost } from '@/components/MimisChat';
import SmsOptIn from '@/components/SmsOptIn';
import { readContact } from '@/lib/customer';
import { formatPhoneInput, normalizePhone } from '@/lib/loyalty';
import { useLocation } from '@/lib/location';

// Contact page enquiry form (2026-10-25). Replaces the GHL "Website Inquiry"
// iframe. Messages go to the same place as the website chat -- the owner
// dashboard Chats tab, as "needs reply" -- recorded with source contact_page.
// The two SMS consent boxes are the same component and wording as checkout,
// rewards sign-up and the chat (A2P 10DLC).
export default function ContactForm() {
  const { location: currentLocation } = useLocation();
  const [f, setF] = useState({ name: '', phone: '', email: '', location: '', topic: 'message', message: '', website: '', company: '' });
  const [smsTxn, setSmsTxn] = useState(false);
  const [smsMkt, setSmsMkt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    const c = readContact();
    setF((x) => ({
      ...x,
      name: x.name || [c?.first_name, c?.last_name].filter(Boolean).join(' '),
      phone: x.phone || (c?.phone_number ? formatPhoneInput(c.phone_number) : ''),
      email: x.email || c?.email || '',
      location: x.location || currentLocation || 'Madison Heights',
    }));
  }, [currentLocation]);

  const set = (k) => (e) => setF({ ...f, [k]: k === 'phone' ? formatPhoneInput(e.target.value) : e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const phone = normalizePhone(f.phone);
    if (!f.name.trim()) { setError('Please enter your name.'); return; }
    if (phone.length !== 10) { setError('Please enter a 10-digit phone number.'); return; }
    if (!f.message.trim()) { setError('Please type your message.'); return; }
    setBusy(true);
    try {
      const s = await chatPost('start', { page: window.location.href, location: f.location, website: f.website, company: f.company });
      const r = await chatPost('submit', {
        session_id: s.session_id, from: 'contact_page',
        kind: f.topic === 'catering' ? 'catering' : 'message',
        name: f.name, phone, email: f.email, location: f.location, message: f.message,
        sms_transactional: smsTxn, sms_marketing: smsMkt, page: window.location.href,
        website: f.website, company: f.company,
      });
      setDone({ reference: r.reference, consentProblem: (smsTxn || smsMkt) && r.consent_saved === false });
    } catch (err) {
      setError(err.message || 'Could not send right now. Please call the store.');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full rounded-xl border border-[rgba(29,32,33,0.15)] dark:border-white/10 bg-white dark:bg-[#1a0f0a] px-4 py-3 text-sm text-[#1D2021] dark:text-[#f5ebd7] placeholder:text-[#5F625F] focus:outline-none focus:border-[#C99700]';
  const label = 'block text-[10px] font-bold tracking-widest uppercase text-[#C99700] dark:text-[#e6b95c] mb-2';

  if (done) {
    return (
      <div className="px-6 md:px-0 py-10">
        <h3 className="text-3xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] mb-3">Thank you!</h3>
        <p className="text-[#3D4041] dark:text-[#f5ebd7]/80 text-sm">
          Your message was sent to the store (reference {done.reference}). We&rsquo;ll get back to you soon. For anything urgent, please call the location.
        </p>
        {done.consentProblem && (
          <p className="mt-3 text-sm text-[#C8102E]" role="alert">Your message was sent, but your text-message choice could not be saved.</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="px-6 md:px-0 pb-8 md:pb-0 space-y-5" noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><label className={label} htmlFor="cf-name">Name</label><input id="cf-name" className={input} value={f.name} onChange={set('name')} autoComplete="name" required /></div>
        <div><label className={label} htmlFor="cf-phone">Phone</label><input id="cf-phone" type="tel" inputMode="numeric" className={input} value={f.phone} onChange={set('phone')} autoComplete="tel" required /></div>
        <div><label className={label} htmlFor="cf-email">Email (optional)</label><input id="cf-email" type="email" className={input} value={f.email} onChange={set('email')} autoComplete="email" /></div>
        <div>
          <label className={label} htmlFor="cf-loc">Location</label>
          <select id="cf-loc" className={input} value={f.location} onChange={set('location')}>
            <option value="Madison Heights">Madison Heights</option>
            <option value="Warren">Warren</option>
          </select>
        </div>
      </div>
      <div>
        <label className={label} htmlFor="cf-topic">What is it about?</label>
        <select id="cf-topic" className={input} value={f.topic} onChange={set('topic')}>
          <option value="message">A question or feedback</option>
          <option value="catering">Catering or a large order</option>
        </select>
      </div>
      <div><label className={label} htmlFor="cf-msg">Message</label><textarea id="cf-msg" rows={5} className={input} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value.slice(0, 1000) })} required /></div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input tabIndex={-1} autoComplete="off" name="website" value={f.website} onChange={set('website')} />
        <input tabIndex={-1} autoComplete="off" name="company" value={f.company} onChange={set('company')} />
      </div>
      <SmsOptIn txn={smsTxn} mkt={smsMkt} onTxn={setSmsTxn} onMkt={setSmsMkt} idPrefix="contact-sms" />
      {error && <p className="text-sm text-[#C8102E]" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="inline-flex items-center justify-center bg-[#C8102E] hover:bg-[#A80D27] text-white rounded-full px-8 py-4 text-xs font-bold tracking-wider uppercase shadow-md disabled:opacity-60">
        {busy ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
