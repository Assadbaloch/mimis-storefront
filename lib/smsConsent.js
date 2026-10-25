// SMS consent (A2P 10DLC, 2026-10-25). Spec: project doc claude/CHATBOT_SPEC.md.
//
// The two wordings below must stay EXACTLY the same as mimis.consent_texts
// rows 'sms_txn_v1' and 'sms_mkt_v1': the server stores the database copy of
// the version named here as proof of what the customer agreed to. To change
// the wording, add a new version in the database first, then change the
// constants here together (the storefront harness compares them).
//
// Rules carriers check, all met here: two separate boxes (order texts are not
// bundled with promotions), unchecked by default, never required to order or
// to send a message, the brand named, message types and frequency stated,
// "Message and data rates may apply", HELP/STOP, links to OUR Terms and
// Privacy Policy, and "not a condition of purchase".
export const SMS_TXN_VERSION = 'sms_txn_v1';
export const SMS_MKT_VERSION = 'sms_mkt_v1';

export const SMS_TXN_TEXT =
  "Text me about my orders. I agree to receive informational and transactional text messages from Khidma Brothers LLC d/b/a Mimi's Pizza & Burger at the number provided, such as order confirmations, order status, pickup and delivery updates, and replies to my questions. Messages may be sent using automated means. Message frequency varies. Message and data rates may apply. Consent is not a condition of purchase. Reply HELP for help, STOP to opt out. See our Terms and Privacy Policy.";

export const SMS_MKT_TEXT =
  "Text me deals and rewards. I agree to receive promotional and marketing text messages from Khidma Brothers LLC d/b/a Mimi's Pizza & Burger at the number provided, such as offers, rewards and announcements. Messages may be sent using automated means. Up to 4 messages per month. Message and data rates may apply. Consent is not a condition of purchase. Reply HELP for help, STOP to opt out. See our Terms and Privacy Policy.";

// The shared ending, rendered with real links in the UI.
export const SMS_LINK_TAIL = 'See our Terms and Privacy Policy.';

/** Body fields every form sends: real booleans and the versions shown. */
export function smsConsentFields(txn, mkt) {
  return {
    sms_transactional_opt_in: txn === true,
    sms_marketing_opt_in: mkt === true,
    sms_txn_version: txn === true ? SMS_TXN_VERSION : undefined,
    sms_mkt_version: mkt === true ? SMS_MKT_VERSION : undefined,
  };
}
