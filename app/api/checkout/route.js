import { NextResponse } from 'next/server';

// Server-only proxy to the online-order-intake Supabase Edge Function (the
// n8n workflow it replaced was retired at cutover -- its webhook now 404s,
// which surfaced as "Could not start checkout" on every order). Keeps
// MIMIS_WEBHOOK_SECRET out of the browser bundle entirely -- that one stays a
// real, user-supplied Vercel env var (it's a true credential, unlike the
// Supabase anon key). Contract verified directly against the deployed
// function (v5) -- identical to the old n8n contract:
//   POST /functions/v1/online-order-intake, header X-Mimis-Webhook-Secret,
//   body { first_name, last_name, phone_number (required), email, order_type,
//          location, notes, redemption_code (optional),
//          delivery_address (optional, required when order_type is "delivery"):
//            { address_line1, address_line2, city, state, postal_code, phone, contact_name },
//          items: [{ name, price_cents, quantity, modifiers, special_instructions }] }
//   -> { success, checkout_url, checkout_session_id, order_id, order_number,
//        order_total_cents, discount_cents, total_due_cents }
// redemption_code is validated server-side (mimis.redemptions) against the
// customer matched by phone_number -- invalid/expired/mismatched codes just
// fall back to discount_cents: 0 rather than failing the order.
const FUNCTIONS_BASE_URL =
  process.env.MIMIS_FUNCTIONS_BASE_URL || 'https://igchqqyassrfpsliyjec.supabase.co/functions/v1';

// Same normalization/validation the n8n Online Order Intake workflow now
// enforces server-side (Calc Order Total + Has Phone?) -- duplicated here so
// bad numbers get a clear, immediate error instead of a silent $0 delivery
// fee discovered only after Uber rejects the dropoff phone. Deliberately
// does NOT slice(-10) a too-long number down to a fake 10-digit string --
// that's what let "89865342183" (11 digits, not a valid US number) through
// undetected before.
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits[0] === '1') return digits.slice(1);
  return null;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const phone = normalizePhone(body?.phone_number);
  if (!phone) {
    return NextResponse.json({ success: false, error: 'A valid 10-digit phone number is required' }, { status: 400 });
  }
  if (!Array.isArray(body?.items) || body.items.length === 0) {
    return NextResponse.json({ success: false, error: 'items must be a non-empty array' }, { status: 400 });
  }
  if (body.order_type === 'delivery') {
    const addr = body.delivery_address;
    if (!addr?.address_line1 || !addr?.city || !addr?.state || !addr?.postal_code) {
      return NextResponse.json({ success: false, error: 'delivery_address is required for delivery orders' }, { status: 400 });
    }
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
    const upstream = await fetch(`${FUNCTIONS_BASE_URL}/online-order-intake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Mimis-Webhook-Secret': secret,
      },
      body: JSON.stringify({
        first_name: body.first_name || '',
        last_name: body.last_name || '',
        phone_number: phone,
        email: body.email || '',
        order_type: body.order_type || 'pickup',
        location: body.location || 'Madison Heights',
        notes: body.notes || '',
        redemption_code: body.redemption_code || '',
        delivery_address: body.order_type === 'delivery' ? body.delivery_address : undefined,
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
