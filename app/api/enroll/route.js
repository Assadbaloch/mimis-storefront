import { NextResponse } from 'next/server';

// Server-only proxy to the n8n Loyalty Enrollment webhook (the same one the
// GHL signup form posts to). Keeps MIMIS_WEBHOOK_SECRET out of the browser
// bundle -- mirrors app/api/checkout/route.js exactly. Contract verified
// directly against the live n8n workflow (czsPjyVwUVbBtbrQ):
//   POST /webhook/loyalty-enroll, header X-Mimis-Webhook-Secret,
//   body { full_name, email, phone (required), birthday, preferred_location }
//   -> { success, status: "enrolled"|"already_enrolled", message, customer_id,
//        points_balance, current_tier?, is_new }
const N8N_BASE_URL = process.env.MIMIS_N8N_BASE_URL || 'https://automation.teamastrixdev.com';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const phone = (body?.phone_number || '').replace(/\D/g, '').slice(-10);
  if (phone.length !== 10) {
    return NextResponse.json({ success: false, error: 'A valid 10-digit phone number is required' }, { status: 400 });
  }

  // Name is mandatory for every conscious sign-up surface (rewards lookup,
  // join-and-notify banner) -- this is the real enforcement point: plain,
  // testable, version-controlled code, not a constraint on mimis.customers
  // itself. It can't live as a table CHECK constraint because it's a
  // path-specific rule, not a universal one: the same table also gets rows
  // from the n8n Loyalty Engine when a POS phone order comes in and Clover
  // has no name on file for that number, and that path is legitimate.
  const fullName = (body?.full_name || '').trim();
  if (!fullName) {
    return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
  }

  const secret = process.env.MIMIS_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing MIMIS_WEBHOOK_SECRET env var');
    return NextResponse.json(
      { success: false, error: 'Sign-up is temporarily unavailable. Please try again shortly or call the store.' },
      { status: 500 }
    );
  }

  try {
    const upstream = await fetch(`${N8N_BASE_URL}/webhook/loyalty-enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Mimis-Webhook-Secret': secret,
      },
      body: JSON.stringify({
        full_name: fullName,
        email: body.email || '',
        phone,
        preferred_location: body.location || 'Madison Heights',
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok || data?.success === false) {
      return NextResponse.json(
        { success: false, error: data?.error || 'Could not complete sign-up. Please try again.' },
        { status: upstream.status || 502 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('enroll proxy failed', err);
    return NextResponse.json(
      { success: false, error: 'Could not reach the rewards system. Please try again shortly.' },
      { status: 502 }
    );
  }
}
