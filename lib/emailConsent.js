// Marketing email consent (2026-10-25). The wording below must stay exactly
// the same as mimis.consent_texts row 'email_mkt_v1': the server stores the
// database copy of that version as proof of what the customer agreed to.
// To change the wording, add a new version in the database first, then
// change both constants here together.
export const EMAIL_CONSENT_VERSION = 'email_mkt_v1';
export const EMAIL_CONSENT_TEXT =
  "Email me offers, rewards updates and menu news from Mimi's Pizza & Burgers. About 4 emails a month. Unsubscribe any time.";

export function looksLikeEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
}
