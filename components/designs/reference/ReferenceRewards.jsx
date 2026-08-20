import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { getLogoUrl } from '@/lib/design';
import RewardsLookup from '@/components/RewardsLookup';
import ReferenceFaq from './ReferenceFaq';

// Rewards page: the reference's design with the real loyalty system inside it.
//
// The reference's own rewards page was a marketing page ending in a GoHighLevel
// signup form. That form is replaced by <RewardsLookup />, the component the
// storefront already uses -- so points balances, tiers and redemptions stay
// exactly as they are. The reward ladder and signup bonus are read from
// mimis.loyalty_rewards / loyalty_config rather than the reference's hardcoded
// figures, so the page cannot advertise a reward the program no longer offers.

const FAQS = [
  { q: 'Do points expire?', a: 'Points never expire while your account is active. We define "active" as one MiMi’s order every 12 months — easy bar to clear.' },
  { q: 'How do I check my points?', a: 'Enter your phone number above and your balance appears straight away. It also prints on every order receipt.' },
  { q: 'Can I use rewards online?', a: 'Yes. Available rewards appear at checkout — one tap to apply. You can also use them in-store; just give your phone number to the cashier.' },
  { q: 'Can I stack rewards?', a: 'One reward per order. You can however combine a reward with an active deal — most members do.' },
  { q: 'Is it free to join?', a: '100% free. No app to download, no monthly fee, no minimum spend. The signup bonus is on us.' },
  { q: 'Do I earn points on dine-in?', a: 'MiMi’s Online Rewards earn and redeem on online orders.' },
];

const STEPS = [
  { num: '01', label: 'Join Free', title: 'Sign up in 30 seconds.', desc: 'Place an online order and you are enrolled automatically — no form, no app. Your bonus points land the moment the order is paid.' },
  { num: '02', label: 'Earn Points', title: 'Points on every dollar spent.', desc: 'Order pizza, burgers, wings, anything on the menu — you earn at both Michigan locations on online orders.' },
  { num: '03', label: 'Redeem Rewards', title: 'Cash in at checkout.', desc: 'Available rewards appear at checkout, one tap to apply. One reward per order, and points never expire while your account is active.' },
];

async function getProgram() {
  const supabase = getSupabasePublicClient();
  const [{ data: config }, { data: rewards }] = await Promise.all([
    supabase.from('loyalty_config')
      .select('program_name, signup_bonus_points, base_points_per_dollar, one_reward_per_order')
      .maybeSingle(),
    // reward_value is a numeric in DOLLARS (5.00, 12.00, 18.00, 43.00) -- not
    // cents, unlike order/menu amounts elsewhere in the schema.
    supabase.from('loyalty_rewards')
      .select('points_required, name, reward_type, reward_value, active')
      .eq('active', true)
      .order('points_required', { ascending: true }),
  ]);
  return { config: config || null, rewards: rewards || [] };
}

export default async function ReferenceRewards() {
  const [{ config, rewards }, logoUrl] = await Promise.all([getProgram(), getLogoUrl()]);
  const bonus = config?.signup_bonus_points ?? 50;
  const perDollar = config?.base_points_per_dollar ?? 10;
  const firstReward = rewards[0];

  return (
    <div className="bg-[#F3EFE4] dark:bg-[#0a0604]">

      {/* ------------------------------ HERO ------------------------------ */}
      <section className="relative py-24 overflow-hidden">
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]" />
                <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">
                  {config?.program_name || "MiMi's Online Rewards"}
                </span>
              </div>

              <h1 className="text-6xl md:text-8xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-[0.9] tracking-tight mb-8">
                Eat pizza.<br />
                Earn points.<br />
                <span className="italic text-[#C99700] dark:text-[#e6b95c]">Get rewards.</span>
              </h1>

              <p className="text-[#3D4041] dark:text-[#f5ebd7]/80 text-lg md:text-xl max-w-md mb-10 leading-relaxed font-medium">
                Join free and we&rsquo;ll drop <strong className="text-[#C8102E] dark:text-[#e6b95c]">{bonus} bonus points</strong> in your account on day one. Earn {perDollar} point{perDollar === 1 ? '' : 's'} for every $1 spent &mdash; on online orders.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="#join"
                  className="inline-flex items-center justify-center bg-[#C8102E] hover:bg-[#A80D27] text-white dark:bg-[#e6b95c] dark:hover:bg-[#d4a84d] dark:text-[#0a0604] rounded-full px-8 py-4 text-sm font-bold tracking-wider uppercase transition-all shadow-md"
                >
                  Check my points &rarr;
                </a>
                <div className="px-4 py-2 rounded-full border border-[#0b4221] bg-[#0b4221]/10 text-[#0b4221] dark:border-[#0b4221] dark:bg-[#0b4221]/20 dark:text-[#4ade80] text-[10px] font-bold tracking-widest uppercase">
                  +{bonus} Bonus on Signup
                </div>
              </div>
            </div>

            {/* Loyalty card mock, as in the reference. */}
            <div className="relative">
              <div className="absolute inset-0 bg-[#C99700]/5 dark:bg-[#e6b95c]/5 blur-3xl rounded-full" />
              <div className="relative bg-[#174A91] dark:bg-gradient-to-br dark:from-[#2a130f] dark:to-[#1a0f0a] border border-[#10396F] dark:border-white/10 rounded-2xl p-8 shadow-[0_20px_40px_rgba(23,74,145,0.2)] dark:shadow-2xl overflow-hidden aspect-[1.6/1] flex flex-col justify-between transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="absolute bottom-0 left-0 w-full h-2 bg-[repeating-linear-gradient(45deg,#C8102E,#C8102E_10px,#C99700_10px,#C99700_20px)] dark:bg-[repeating-linear-gradient(45deg,#b41d24,#b41d24_10px,#0b4221_10px,#0b4221_20px)]" />

                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="MiMi's" className="h-24 w-auto max-w-none drop-shadow-md" />
                    )}
                  </div>
                  <div className="w-12 h-8 rounded bg-[#E0AE00] dark:bg-[#e6b95c]/80 opacity-90" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-bold tracking-widest text-white/70 dark:text-[#f5ebd7]/50 uppercase">Member</span>
                    <span className="w-1 h-1 rounded-full bg-[#E0AE00] dark:bg-[#e6b95c]" />
                    <span className="text-[8px] font-bold tracking-widest text-white/70 dark:text-[#f5ebd7]/50 uppercase">Active</span>
                  </div>
                  <div className="text-2xl font-serif text-white dark:text-[#f5ebd7] font-bold">Your Name Here</div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-white/70 dark:text-[#f5ebd7]/50 uppercase mb-1">Balance</div>
                    <div className="text-5xl font-bold text-[#E0AE00] dark:text-[#e6b95c] flex items-baseline gap-1">
                      {bonus} <span className="text-lg text-white/80 dark:text-[#e6b95c]/70 font-normal">pts</span>
                    </div>
                  </div>
                  {firstReward && (
                    <div className="text-right">
                      <div className="text-[8px] font-bold tracking-widest text-white/70 dark:text-[#f5ebd7]/50 uppercase mb-1">Next Reward</div>
                      <div className="text-[#FFF9EC] dark:text-[#e6b95c] font-bold text-sm">
                        {firstReward.name} &bull; {Math.max(0, firstReward.points_required - bonus)} pts to go
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- HOW IT WORKS -------------------------- */}
      <section className="py-24 bg-[#EAE4D5]/50 dark:bg-[#110a08] border-y border-[rgba(29,32,33,0.1)] dark:border-white/5">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]" />
            <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">How It Works</span>
          </div>

          <h2 className="text-5xl md:text-7xl font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-tight tracking-tight mb-6">
            Three steps. <span className="font-serif italic text-[#C99700] dark:text-[#e6b95c]">Zero<br />strings.</span>
          </h2>

          <p className="text-[#3D4041] dark:text-[#f5ebd7]/80 text-lg max-w-xl mb-16 font-medium">
            No app to download, no monthly fee, no minimums. Order once and start earning on every order after that.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div key={step.num} className="bg-[#FFF9EC] dark:bg-[#1a0f0a] border border-[rgba(29,32,33,0.1)] dark:border-white/5 rounded-2xl p-8 shadow-[0_12px_30px_rgba(29,32,33,0.06)] dark:shadow-none hover:shadow-[0_20px_40px_rgba(29,32,33,0.12)] dark:hover:bg-[#1f120c] transition-all duration-300">
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-5xl font-serif text-[#C99700] dark:text-[#e6b95c]">{step.num}</span>
                  <span className="text-[10px] font-bold tracking-widest text-[#C99700]/80 dark:text-[#e6b95c]/70 uppercase">{step.label}</span>
                </div>
                <h3 className="text-2xl font-bold text-[#1D2021] dark:text-[#f5ebd7] mb-4">{step.title}</h3>
                <p className="text-[#3D4041] dark:text-[#f5ebd7]/70 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------- REWARD LADDER -------------------------- */}
      {rewards.length > 0 && (
        <section className="py-24 bg-[#F3EFE4] dark:bg-[#140b08]">
          <div className="container mx-auto px-6 md:px-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]" />
              <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">Reward Ladder</span>
            </div>

            <h2 className="text-5xl md:text-7xl font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-tight tracking-tight mb-16">
              The more you earn,<br />
              <span className="font-serif italic text-[#C99700] dark:text-[#e6b95c]">the better it gets.</span>
            </h2>

            <div className="border border-[rgba(29,32,33,0.12)] dark:border-white/10 rounded-2xl overflow-hidden bg-[#FFF9EC] dark:bg-[#0a0604]/50 shadow-[0_12px_30px_rgba(29,32,33,0.06)]">
              <div className="grid grid-cols-12 gap-4 p-6 border-b border-[rgba(29,32,33,0.1)] dark:border-white/10 text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase bg-[#EAE4D5] dark:bg-transparent">
                <div className="col-span-3">Points</div>
                <div className="col-span-6">Reward</div>
                <div className="col-span-3 text-right">Approx. Value</div>
              </div>

              {rewards.map((tier) => (
                <div key={tier.points_required} className="grid grid-cols-12 gap-4 p-8 border-b border-[rgba(29,32,33,0.08)] dark:border-white/5 items-center hover:bg-[#F3EFE4] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="col-span-3 flex items-baseline gap-1">
                    <span className="text-3xl md:text-4xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7]">{tier.points_required}</span>
                    <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c]/70 uppercase hidden md:inline">Points</span>
                  </div>
                  <div className="col-span-6">
                    <span className="text-lg md:text-xl font-bold text-[#1D2021] dark:text-[#f5ebd7]">{tier.name}</span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-[#C99700] dark:text-[#e6b95c]">
                      {Number(tier.reward_value) > 0 ? `~$${Number(tier.reward_value).toFixed(0)} VALUE` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center text-[9px] font-bold tracking-widest text-[#5F625F] dark:text-[#f5ebd7]/40 uppercase space-x-2">
              {config?.one_reward_per_order && <><span>One reward per order</span><span>&bull;</span></>}
              <span>Rewards redeemable online</span>
              <span>&bull;</span>
              <span>Points never expire while account is active</span>
            </div>
          </div>
        </section>
      )}

      {/* ---------------------- THE REAL LOYALTY SYSTEM --------------------- */}
      <section id="join" className="py-24 bg-[#EAE4D5]/50 dark:bg-[#110a08] border-t border-[rgba(29,32,33,0.1)] dark:border-white/5">
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]" />
              <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">Your Balance</span>
              <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]" />
            </div>

            <h2 className="text-4xl md:text-6xl font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-tight tracking-tight mb-6">
              Check your <span className="font-serif italic text-[#C99700] dark:text-[#e6b95c]">points</span> right now.
            </h2>

            <p className="text-[#3D4041] dark:text-[#f5ebd7]/80 text-lg max-w-xl mx-auto font-medium">
              No password, no app. Enter the phone number you order with and your balance, tier and available rewards appear.
            </p>
          </div>

          {/* The reference had a GoHighLevel signup form here. This is the real
              loyalty lookup the storefront already runs -- same component the
              original design uses, so balances and redemptions are unchanged. */}
          <RewardsLookup />
        </div>
      </section>

      {/* ------------------------------- FAQS ------------------------------ */}
      <section className="py-24">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]" />
            <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">Common Questions</span>
            <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]" />
          </div>

          <h2 className="text-5xl md:text-7xl font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-tight tracking-tight mb-16 text-center">
            Everything you might<br />
            <span className="font-serif italic text-[#C99700] dark:text-[#e6b95c]">wonder about.</span>
          </h2>

          <ReferenceFaq items={FAQS} />
        </div>
      </section>
    </div>
  );
}
