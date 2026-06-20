import { NextResponse } from 'next/server';

// Server-only proxy to the n8n Online Order Intake webhook. Keeps
// MIMIS_WEBHOOK_SECRET out of the browser bundle entirely -- that one stays a
// real, user-supplied Vercel env var (it's a true credential, unlike the
// Supabase anon key). Contract verified directly against the live n8n
// workflow (KxHdYKLCXeyrxgHS):
//   POST /webhook/online-order-intake, header X-Mimis-Webhook-Secret,
//   body { first_name, last_name, phone_number (required), email, order_type,
//          location, notes, redemption_code (optional),
//          items: [{ name, price_cents, quantity, modifiers, special_instructions }] }
//   -> { success, checkout_url, checkout_session_id, order_id, order_number,
//        order_total_cents, discount_cents, total_due_cents }
// redemption_code is validated server-side (mimis.redemptions) against the
// customer matched by phone_number -- invalid/expired/mismatched codes just
// fall back to discount_cents: 0 rather than failing the order.
const N8N_BASE_URL = process.env.MIMIS_N8N_BASE_URL || 'https://automation.teamastrixdev.com';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.phone_number) {
    return NextResponse.json({ success: false, error: 'phone_number is required' }, { status: 400 });
  }
  if (!Array.isArray(body?.items) || body.items.length === 0) {
    return NextResponse.json({ success: false, error: 'items must be a non-empty array' }, { status: 400 });
  }

  const secret = process.env.MIMIS_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing MIMIS_WEBHOOK_SECRET env var');
    return NextResponse.json(
      { success: false, error: 'Checkout is temporarily unavailable. Please try again shortly or call the store.' },
      { status: 500 }
    );
  }

  try {
    const upstream = await fetch(`${N8N_BASE_URL}/webhook/online-order-intake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Mimis-Webhook-Secret': secret,
      },
      body: JSON.stringify({
        first_name: body.first_name || '',
        last_name: body.last_name || '',
        phone_number: body.phone_number,
        email: body.email || '',
        order_type: body.order_type || 'pickup',
        location: body.location || 'Madison Heights',
        notes: body.notes || '',
        redemption_code: body.redemption_code || '',
        items: body.items,
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok || data?.success === false) {
      return NextResponse.json(
        { success: false, error: data?.error || 'Could not start checkout. Please try again.' },
        { status: upstream.status || 502 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('checkout proxy failed', err);
    return NextResponse.json(
      { success: false, error: 'Could not reach the order system. Please try again shortly.' },
      { status: 502 }
    );
  }
}
