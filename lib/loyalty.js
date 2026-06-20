// Shared helpers for the phone-as-identity loyalty pattern used across
// RewardsLookup.jsx (/rewards) and MemberRewardsPanel.jsx (cart/checkout).
// Pulled out so both surfaces format/validate phone numbers and label tiers
// identically -- previously duplicated inline in RewardsLookup.jsx only.

export const REDEMPTION_CODE_KEY = 'mimis-active-redemption-code';
export const MEMBER_PHONE_KEY = 'mimis-member-phone';

export const TIER_LABEL = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
export const TIER_CLASS = {
  bronze: 'bg-cream/10 text-cream/80',
  silver: 'bg-cream/20 text-cream',
  gold: 'bg-gold/20 text-gold',
};

export function normalizePhone(value) {
  return (value || '').replace(/\D/g, '').slice(-10);
}

export function formatPhoneInput(value) {
  const digits = normalizePhone(value);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
