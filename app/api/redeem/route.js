import { NextResponse } from 'next/server';

// Server-only proxy to the n8n Reward Redemption webhook -- mirrors
// app/api/enroll/route.js and app/api/checkout/route.js exactly (keeps
// MIMIS_WEBHOOK_SECRET out of the browser bundle). Contract verified
// directly against the live n8n workflow (zU5VxFe5U8mp0BEq):
//   POST /webhook/redeem-reward, header X-Mimis-Webhook-Secret,
//   body { action: "redeem"|"status", phone_number, reward_id? }
//
//   action "redeem" -> { success, code, redemption_id, reward_name,
//     reward_value, points_redeemed, new_balance, expires_at }
//     or { success: false, error: "missing_fields"|"customer_not_found"|
//     "reward_not_found"|"insufficient_points" }
//
//   action "status" -> { success, points_balance, current_tier,
//     active_redemptions: [{ code, reward_name, reward_value, status,
//     expires_at }] } or { success: false, error: "customer_not_found" }
const N8N_BASE_URL = process.env.MIMIS_N8N_BASE_URL || 'https://automation.teamastrixdev.com';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body?.action === 'status' ? 'status' : body?.action === 'redeem' ? 'redeem' : null;
  if (!action) {
    return NextResponse.json({ success: false, error: 'unknown_action' }, { status: 400 });
  }

  const phone = (body?.phone_number || '').replace(/\D/g, '').slice(-10);
  if (phone.length !== 10) {
    return NextResponse.json({ success: false, error: 'A valid 10-digit phone number is required' }, { status: 400 });
  }

  if (action === 'redeem' && !body?.reward_id) {
    return NextResponse.json({ success: false, error: 'missing_fields' }, { status: 400 });
  }

  const secret = process.env.MIMIS_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing MIMIS_WEBHOOK_SECRET env var');
    return NextResponse.json(
      { success: false, error: 'Rewards are temporarily unavailable. Please try again shortly or call the store.' },
      { status: 500 }
    );
  }

  try {
    const upstream = await fetch(`${N8N_BASE_URL}/webhook/redeem-reward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Mimis-Webhook-Secret': secret,
      },
      body: JSON.stringify({
        action,
        phone_number: phone,
        reward_id: body.reward_id || '',
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok || data?.success === false) {
      return NextResponse.json(
        { success: false, error: data?.error || 'Could not complete that request. Please try again.' },
        { status: upstream.status || 502 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('redeem proxy failed', err);
    return NextResponse.json(
      { success: false, error: 'Could not reach the rewards system. Please try again shortly.' },
      { status: 502 }
    );
  }
}
