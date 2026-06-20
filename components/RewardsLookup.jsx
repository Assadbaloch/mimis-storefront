'use client';
import { useEffect, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import TrendingBanner from '@/components/TrendingBanner';

// Phone-based, no-password member rewards lookup. Mirrors the same
// phone-as-identity pattern already used by mimis.customers everywhere else
// in the system (GHL enrollment form, Loyalty Engine, owner dashboard) --
// there is no separate auth account for customers, the phone number IS the
// lookup key. Reads go straight through the anon client the same way the
// existing owner dashboard portal already reads mimis.customers (RLS already
// grants anon a blanket SELECT on this table -- "anon read customers portal").
// Writes (new enrollment) go through the existing n8n loyalty-enroll webhook
// via /api/enroll, never a direct anon write.
const TIER_LABEL = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
const TIER_CLASS = {
  bronze: 'bg-cream/10 text-cream/80',
  silver: 'bg-cream/20 text-cream',
  gold: 'bg-gold/20 text-gold',
};

function normalizePhone(value) {
  return (value || '').replace(/\D/g, '').slice(-10);
}

function formatPhoneInput(value) {
  const digits = normalizePhone(value);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function RewardsLookup() {
  const [view, setView] = useState('checking'); // checking | phone_entry | loading | dashboard | enroll_offer | enrolling | error
  const [phoneInput, setPhoneInput] = useState('');
  const [customer, setCustomer] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [config, setConfig] = useState(null);
  const [enrollName, setEnrollName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [welcomeBonus, setWelcomeBonus] = useState(null);
  const [activeRedemptions, setActiveRedemptions] = useState([]);
  const [redeemingId, setRedeemingId] = useState(null);
  const [redeemError, setRedeemError] = useState('');
  const [justRedeemed, setJustRedeemed] = useState(null);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem('mimis-member-phone');
    if (saved) {
      setPhoneInput(formatPhoneInput(saved));
      lookup(saved);
    } else {
      setView('phone_entry');
    }
  }, []);

  async function lookup(rawPhone) {
    const phone = normalizePhone(rawPhone);
    if (phone.length !== 10) {
      setErrorMsg('Enter a valid 10-digit phone number.');
      setView('phone_entry');
      return;
    }
    setErrorMsg('');
    setView('loading');

    const supabase = getSupabasePublicClient();
    const { data: customerRow, error: customerErr } = await supabase
      .from('customers')
      .select('*')
      .eq('phone_number', phone)
      .maybeSingle();

    if (customerErr) {
      setErrorMsg('Could not look up your rewards right now. Please try again.');
      setView('phone_entry');
      return;
    }

    if (!customerRow) {
      setView('enroll_offer');
      return;
    }

    window.localStorage.setItem('mimis-member-phone', phone);
    await loadDashboard(customerRow);
  }

  async function loadDashboard(customerRow) {
    const supabase = getSupabasePublicClient();
    const [configRes, rewardsRes, txRes] = await Promise.all([
      config ? Promise.resolve({ data: config }) : supabase.from('loyalty_config').select('*').limit(1).maybeSingle(),
      supabase.from('loyalty_rewards').select('*').eq('active', true).order('points_required', { ascending: true }),
      supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customerRow.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (configRes.data) setConfig(configRes.data);
    setRewards(rewardsRes.data || []);
    setTransactions(txRes.data || []);
    setCustomer(customerRow);
    setView('dashboard');
    refreshActiveRedemptions(customerRow.phone_number);
  }

  // Active issued (unexpired, unused) discount codes for this customer.
  // Goes through /api/redeem (server-side proxy to the n8n redemption
  // webhook) rather than a direct anon Supabase read -- mimis.redemptions
  // intentionally has no anon SELECT policy so codes are only ever
  // readable via a service-role n8n path.
  async function refreshActiveRedemptions(phone) {
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', phone_number: phone }),
      });
      const data = await res.json();
      if (data.success) setActiveRedemptions(data.active_redemptions || []);
    } catch (err) {
      console.error('failed to load active redemptions', err);
    }
  }

  async function handleRedeem(reward) {
    setRedeemError('');
    setRedeemingId(reward.id);
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redeem',
          phone_number: customer.phone_number,
          reward_id: reward.id,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setRedeemError(
          data.error === 'insufficient_points'
            ? 'Your balance changed before this went through — refresh and try again.'
            : data.error === 'reward_not_found'
            ? 'This reward is no longer available.'
            : 'Could not redeem that reward. Please try again.'
        );
        return;
      }
      setCustomer((prev) => ({ ...prev, points_balance: data.new_balance }));
      setJustRedeemed(data);
      setActiveRedemptions((prev) => [
        { code: data.code, reward_name: data.reward_name, reward_value: data.reward_value, status: 'issued', expires_at: data.expires_at },
        ...prev,
      ]);
      window.localStorage.setItem('mimis-active-redemption-code', data.code);
    } catch (err) {
      console.error('redeem failed', err);
      setRedeemError('Could not reach the rewards system. Please try again shortly.');
    } finally {
      setRedeemingId(null);
    }
  }

  async function handleCopyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    } catch {
      // Clipboard API unavailable -- code is still visible on screen to copy by hand.
    }
  }

  async function handleEnroll(e) {
    e.preventDefault();
    setView('enrolling');
    setErrorMsg('');
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: enrollName,
          email: enrollEmail,
          phone_number: phoneInput,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Could not complete sign-up. Please try again.');
        setView('enroll_offer');
        return;
      }
      setWelcomeBonus(data.is_new ? data.points_balance : null);
      const phone = normalizePhone(phoneInput);
      window.localStorage.setItem('mimis-member-phone', phone);

      const supabase = getSupabasePublicClient();
      const { data: customerRow } = await supabase
        .from('customers')
        .select('*')
        .eq('phone_number', phone)
        .maybeSingle();

      if (customerRow) {
        await loadDashboard(customerRow);
      } else {
        setView('phone_entry');
      }
    } catch (err) {
      console.error('enroll failed', err);
      setErrorMsg('Could not reach the rewards system. Please try again shortly.');
      setView('enroll_offer');
    }
  }

  function handleSignOut() {
    window.localStorage.removeItem('mimis-member-phone');
    setCustomer(null);
    setPhoneInput('');
    setWelcomeBonus(null);
    setView('phone_entry');
  }

  if (view === 'checking') {
    return <p className="text-center text-cream/50 py-24">Loading…</p>;
  }

  if (view === 'phone_entry' || view === 'loading') {
    return (
      <div className="max-w-md mx-auto px-5 py-20 text-center">
        <p className="section-label mb-2">Mimi&rsquo;s Rewards</p>
        <h1 className="font-serif font-bold text-3xl text-cream mb-3">Check Your Points</h1>
        <p className="text-cream/55 mb-8">Enter your phone number to see your balance and rewards. No password needed.</p>
        <form
          onSubmit={(e) => { e.preventDefault(); lookup(phoneInput); }}
          className="flex flex-col gap-3"
        >
          <input
            type="tel"
            inputMode="numeric"
            placeholder="(555) 123-4567"
            value={phoneInput}
            onChange={(e) => setPhoneInput(formatPhoneInput(e.target.value))}
            className="input text-center text-lg"
            autoFocus
          />
          {errorMsg && <p className="text-brick text-sm">{errorMsg}</p>}
          <button type="submit" disabled={view === 'loading'} className="btn-primary w-full">
            {view === 'loading' ? 'Looking up…' : 'View My Rewards'}
          </button>
        </form>
      </div>
    );
  }

  if (view === 'enroll_offer' || view === 'enrolling') {
    return (
      <div className="max-w-md mx-auto px-5 py-20">
        <p className="section-label mb-2 text-center">Mimi&rsquo;s Rewards</p>
        <h1 className="font-serif font-bold text-3xl text-cream mb-3 text-center">You&rsquo;re Not Enrolled Yet</h1>
        <p className="text-cream/55 mb-8 text-center">Join free and get 50 bonus points right away.</p>
        <form onSubmit={handleEnroll} className="flex flex-col gap-3">
          <input
            type="tel"
            value={phoneInput}
            disabled
            className="input text-center opacity-60"
          />
          <input
            type="text"
            placeholder="Full name"
            value={enrollName}
            onChange={(e) => setEnrollName(e.target.value)}
            className="input"
            required
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={enrollEmail}
            onChange={(e) => setEnrollEmail(e.target.value)}
            className="input"
          />
          {errorMsg && <p className="text-brick text-sm">{errorMsg}</p>}
          <button type="submit" disabled={view === 'enrolling'} className="btn-primary w-full">
            {view === 'enrolling' ? 'Joining…' : 'Join Mimi’s Rewards'}
          </button>
          <button type="button" onClick={() => setView('phone_entry')} className="text-cream/40 hover:text-cream/70 text-xs">
            Use a different number
          </button>
        </form>
      </div>
    );
  }

  if (view === 'dashboard' && customer) {
    const lifetimePts = customer.lifetime_points || 0;
    const silverMin = config?.silver_min_lifetime_pts;
    const goldMin = config?.gold_min_lifetime_pts;
    let nextTierLabel = null;
    let progressPct = 100;
    let ptsToNext = 0;
    if (customer.current_tier === 'bronze' && silverMin) {
      nextTierLabel = 'Silver';
      progressPct = Math.min(100, (lifetimePts / silverMin) * 100);
      ptsToNext = Math.max(0, silverMin - lifetimePts);
    } else if (customer.current_tier === 'silver' && goldMin) {
      nextTierLabel = 'Gold';
      progressPct = Math.min(100, ((lifetimePts - silverMin) / (goldMin - silverMin)) * 100);
      ptsToNext = Math.max(0, goldMin - lifetimePts);
    }

    return (
      <div className="max-w-xl mx-auto px-5 py-16">
        <div className="flex items-center justify-between mb-1">
          <p className="section-label">Mimi&rsquo;s Rewards</p>
          <button onClick={handleSignOut} className="text-cream/35 hover:text-cream/65 text-xs">Not you?</button>
        </div>
        <h1 className="font-serif font-bold text-3xl text-cream mb-4">
          Welcome back{customer.first_name ? `, ${customer.first_name}` : ''}
        </h1>

        <TrendingBanner />

        {welcomeBonus != null && (
          <p className="text-gold text-sm mb-4">You just earned {welcomeBonus} bonus points for joining!</p>
        )}

        <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-cream/55 text-xs uppercase tracking-wide font-bold mb-1">Points Balance</p>
              <p className="font-serif font-bold text-4xl text-gold">{customer.points_balance}</p>
            </div>
            <span className={`badge ${TIER_CLASS[customer.current_tier] || TIER_CLASS.bronze}`}>
              {TIER_LABEL[customer.current_tier] || 'Bronze'} Tier
            </span>
          </div>

          {nextTierLabel && (
            <div>
              <div className="h-1.5 rounded-full bg-cream/10 overflow-hidden mb-1.5">
                <div className="h-full bg-gold rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-cream/45 text-xs">{ptsToNext} lifetime points to {nextTierLabel}</p>
            </div>
          )}
        </div>

        {justRedeemed && (
          <div className="mt-6 rounded-2xl border border-gold/40 bg-gold/[0.08] p-5 text-center">
            <p className="text-cream/60 text-xs uppercase tracking-wide font-bold mb-1">Reward Redeemed!</p>
            <p className="font-serif font-bold text-2xl text-gold mb-1 tracking-wide">{justRedeemed.code}</p>
            <p className="text-cream/60 text-xs mb-3">{justRedeemed.reward_name} &middot; use this code at checkout</p>
            <button onClick={() => handleCopyCode(justRedeemed.code)} className="btn-secondary !px-4 !py-2 text-xs">
              {copiedCode === justRedeemed.code ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        )}

        {rewards.length > 0 && (
          <div className="mt-8">
            <p className="section-label mb-3">Available Rewards</p>
            {redeemError && <p className="text-brick text-sm mb-3">{redeemError}</p>}
            <div className="space-y-2">
              {rewards.map((r) => {
                const unlocked = customer.points_balance >= r.points_required;
                const redeeming = redeemingId === r.id;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 gap-3 ${
                      unlocked ? 'border-gold/30 bg-gold/[0.06]' : 'border-cream/10 bg-cream/[0.02]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${unlocked ? 'text-cream' : 'text-cream/50'}`}>{r.name}</p>
                      {r.description && <p className="text-cream/40 text-xs mt-0.5">{r.description}</p>}
                    </div>
                    {unlocked ? (
                      <button
                        onClick={() => handleRedeem(r)}
                        disabled={redeeming}
                        className="btn-primary !px-4 !py-2 text-xs shrink-0 disabled:opacity-60"
                      >
                        {redeeming ? 'Redeeming…' : `Redeem · ${r.points_required} pts`}
                      </button>
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-wide shrink-0 ml-3 text-cream/35">
                        {r.points_required} pts
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeRedemptions.length > 0 && (
          <div className="mt-8">
            <p className="section-label mb-3">Your Active Codes</p>
            <div className="space-y-2">
              {activeRedemptions.map((red) => (
                <div
                  key={red.code}
                  className="flex items-center justify-between rounded-xl border border-cream/10 bg-cream/[0.02] px-4 py-3 gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-serif font-bold text-gold tracking-wide">{red.code}</p>
                    <p className="text-cream/40 text-xs mt-0.5">
                      {red.reward_name} &middot; expires{' '}
                      {new Date(red.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyCode(red.code)}
                    className="text-cream/40 hover:text-cream/70 text-xs shrink-0"
                  >
                    {copiedCode === red.code ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-cream/35 text-xs mt-3">Enter a code at checkout to apply it to your order.</p>
          </div>
        )}

        {transactions.length > 0 && (
          <div className="mt-8">
            <p className="section-label mb-3">Recent Activity</p>
            <div className="space-y-1.5">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-cream/65">
                    {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' · '}
                    {tx.notes || tx.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className={tx.points >= 0 ? 'text-gold' : 'text-cream/50'}>
                    {tx.points >= 0 ? '+' : ''}{tx.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 py-20 text-center">
      <p className="text-cream/55 mb-6">Something went wrong loading your rewards.</p>
      <button onClick={() => setView('phone_entry')} className="btn-primary">Try Again</button>
    </div>
  );
}
