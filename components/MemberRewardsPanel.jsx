'use client';
import { useEffect, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import {
  REDEMPTION_CODE_KEY,
  MEMBER_PHONE_KEY,
  TIER_LABEL,
  TIER_CLASS,
  normalizePhone,
  formatPhoneInput,
} from '@/lib/loyalty';

// Inline points-redemption panel for /cart and /checkout. Closes the gap the
// previous flow had: redeeming a reward required leaving the order entirely
// for a separate /rewards lookup, then carrying a code back by hand. Here,
// the same redeem action (POST /api/redeem, same n8n webhook RewardsLookup.jsx
// already uses) is available right where the member is about to pay --
// selecting a reward applies it automatically (no code to copy/paste), and
// any reward they've already redeemed but not yet used shows up clearly
// labeled "Pending" (mimis.redemptions.status = 'issued') until it's actually
// used on an order (status becomes 'applied', handled server-side by the
// online-order-intake webhook -- not this component's concern).
//
// onCodeChange(code | null) lets the host page (checkout) keep its own
// `redemption_code` form field in sync; this component owns localStorage
// persistence either way, so a plain <MemberRewardsPanel /> with no prop
// (as used on /cart) still works standalone.
export default function MemberRewardsPanel({ onCodeChange = () => {}, onPhoneIdentified = () => {} }) {
  const [phase, setPhase] = useState('init'); // init | phone_entry | checking | join | member | error
  const [phoneInput, setPhoneInput] = useState('');
  const [customer, setCustomer] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [pendingCodes, setPendingCodes] = useState([]);
  const [selectedCode, setSelectedCode] = useState(null);
  const [joinName, setJoinName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joining, setJoining] = useState(false);
  const [redeemingId, setRedeemingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [justRedeemedCode, setJustRedeemedCode] = useState(null);

  useEffect(() => {
    const savedCode = window.localStorage.getItem(REDEMPTION_CODE_KEY);
    if (savedCode) {
      setSelectedCode(savedCode);
      onCodeChange(savedCode);
    }
    const savedPhone = window.localStorage.getItem(MEMBER_PHONE_KEY);
    if (savedPhone) {
      setPhoneInput(formatPhoneInput(savedPhone));
      lookup(savedPhone);
    } else {
      setPhase('phone_entry');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectCode(code) {
    setSelectedCode(code);
    window.localStorage.setItem(REDEMPTION_CODE_KEY, code);
    onCodeChange(code);
  }

  function clearSelectedCode() {
    setSelectedCode(null);
    window.localStorage.removeItem(REDEMPTION_CODE_KEY);
    onCodeChange(null);
  }

  async function lookup(rawPhone) {
    const phone = normalizePhone(rawPhone);
    if (phone.length !== 10) {
      setErrorMsg('Enter a valid 10-digit phone number.');
      setPhase('phone_entry');
      return;
    }
    setErrorMsg('');
    setPhase('checking');

    const supabase = getSupabasePublicClient();
    const { data: customerRow, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone_number', phone)
      .maybeSingle();

    if (error) {
      setErrorMsg('Could not check your rewards right now.');
      setPhase('error');
      return;
    }

    if (!customerRow) {
      setPhase('join');
      return;
    }

    window.localStorage.setItem(MEMBER_PHONE_KEY, phone);
    await loadMember(customerRow);
  }

  async function loadMember(customerRow) {
    const supabase = getSupabasePublicClient();
    const [rewardsRes, statusRes] = await Promise.all([
      supabase.from('loyalty_rewards').select('*').eq('active', true).order('points_required', { ascending: true }),
      fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', phone_number: customerRow.phone_number }),
      }).then((r) => r.json()).catch(() => ({ success: false })),
    ]);

    setRewards(rewardsRes.data || []);
    setPendingCodes(statusRes.success ? statusRes.active_redemptions || [] : []);
    setCustomer(customerRow);
    setPhase('member');
    onPhoneIdentified(customerRow.phone_number);
  }

  async function handleRedeem(reward) {
    setErrorMsg('');
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
        setErrorMsg(
          data.error === 'insufficient_points'
            ? 'Your balance changed before this went through — refresh and try again.'
            : data.error === 'reward_not_found'
            ? 'This reward is no longer available.'
            : 'Could not redeem that reward. Please try again.'
        );
        return;
      }
      setCustomer((prev) => ({ ...prev, points_balance: data.new_balance }));
      setPendingCodes((prev) => [
        { code: data.code, reward_name: data.reward_name, reward_value: data.reward_value, status: 'issued', expires_at: data.expires_at },
        ...prev,
      ]);
      setJustRedeemedCode(data.code);
      selectCode(data.code);
    } catch {
      setErrorMsg('Could not reach the rewards system. Please try again shortly.');
    } finally {
      setRedeemingId(null);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setJoining(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: joinName, email: joinEmail, phone_number: phoneInput }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Could not complete sign-up. Please try again.');
        setJoining(false);
        return;
      }
      const phone = normalizePhone(phoneInput);
      window.localStorage.setItem(MEMBER_PHONE_KEY, phone);
      const supabase = getSupabasePublicClient();
      const { data: customerRow } = await supabase.from('customers').select('*').eq('phone_number', phone).maybeSingle();
      if (customerRow) await loadMember(customerRow);
    } catch {
      setErrorMsg('Could not reach the rewards system. Please try again shortly.');
    } finally {
      setJoining(false);
    }
  }

  function switchAccount() {
    window.localStorage.removeItem(MEMBER_PHONE_KEY);
    setCustomer(null);
    setPhoneInput('');
    setErrorMsg('');
    setPhase('phone_entry');
  }

  return (
    <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="section-label !mb-0">Use Your Points</p>
        {phase === 'member' && (
          <button type="button" onClick={switchAccount} className="text-cream/35 hover:text-cream/65 text-xs">
            Not you?
          </button>
        )}
      </div>

      {(phase === 'init' || phase === 'checking') && (
        <p className="text-cream/45 text-sm py-2">Checking your rewards…</p>
      )}

      {phase === 'phone_entry' && (
        <form
          onSubmit={(e) => { e.preventDefault(); lookup(phoneInput); }}
          className="flex flex-col sm:flex-row gap-2 mt-3"
        >
          <input
            type="tel"
            inputMode="numeric"
            placeholder="Rewards phone number"
            value={phoneInput}
            onChange={(e) => setPhoneInput(formatPhoneInput(e.target.value))}
            className="input flex-1"
          />
          <button type="submit" className="btn-secondary !px-4 !py-3 text-sm shrink-0">Check Points</button>
        </form>
      )}

      {phase === 'join' && (
        <form onSubmit={handleJoin} className="mt-3 space-y-2.5">
          <p className="text-cream/55 text-xs">
            {formatPhoneInput(phoneInput)} isn&rsquo;t enrolled yet — join free and get bonus points right away.
          </p>
          <input
            type="text"
            placeholder="Full name"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            className="input w-full"
            required
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={joinEmail}
            onChange={(e) => setJoinEmail(e.target.value)}
            className="input w-full"
          />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={joining} className="btn-primary text-sm disabled:opacity-50">
              {joining ? 'Joining…' : 'Join & Check Points'}
            </button>
            <button type="button" onClick={switchAccount} className="text-cream/40 hover:text-cream/70 text-xs">
              Use a different number
            </button>
          </div>
        </form>
      )}

      {phase === 'error' && (
        <div className="mt-3">
          <p className="text-brick text-sm mb-2">{errorMsg}</p>
          <button type="button" onClick={switchAccount} className="text-cream/40 hover:text-cream/70 text-xs">Try again</button>
        </div>
      )}

      {phase === 'member' && customer && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <p className="text-cream/70 text-sm">
              Hi{customer.first_name ? ` ${customer.first_name}` : ''} — you have{' '}
              <span className="text-gold font-serif font-semibold">{customer.points_balance} points</span>
            </p>
            <span className={`badge ${TIER_CLASS[customer.current_tier] || TIER_CLASS.bronze}`}>
              {TIER_LABEL[customer.current_tier] || 'Bronze'}
            </span>
          </div>

          {errorMsg && <p className="text-brick text-sm mb-3">{errorMsg}</p>}

          {pendingCodes.length > 0 && (
            <div className="space-y-2 mb-4">
              {pendingCodes.map((pc) => {
                const isSelected = pc.code === selectedCode;
                return (
                  <div
                    key={pc.code}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 gap-3 ${
                      isSelected ? 'border-gold/40 bg-gold/[0.08]' : 'border-cream/10 bg-cream/[0.02]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-cream text-sm font-semibold">
                        {pc.reward_name} <span className="text-gold font-serif tracking-wide">{pc.code}</span>
                      </p>
                      <p className="text-cream/40 text-xs mt-0.5">
                        {isSelected ? 'Pending — applies automatically at checkout' : 'Redeemed, unused — pending'}
                      </p>
                    </div>
                    {isSelected ? (
                      <button type="button" onClick={clearSelectedCode} className="text-cream/40 hover:text-cream/70 text-xs shrink-0">
                        Remove
                      </button>
                    ) : (
                      <button type="button" onClick={() => selectCode(pc.code)} className="btn-secondary !px-3 !py-1.5 text-xs shrink-0">
                        Use This
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {rewards.length > 0 && (
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
          )}

          {rewards.length === 0 && pendingCodes.length === 0 && (
            <p className="text-cream/40 text-sm">No rewards available right now — keep ordering to earn points!</p>
          )}

          {justRedeemedCode && (
            <p className="text-gold text-xs mt-3">Applied automatically — no code to copy. ✓</p>
          )}
        </div>
      )}
    </div>
  );
}
