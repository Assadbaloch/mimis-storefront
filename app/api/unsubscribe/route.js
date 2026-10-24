import { NextResponse } from 'next/server';

// Proxy for the /unsubscribe page to the email-webhook function. The link in
// every offer email carries the address and a token made from it, so a link
// can only ever unsubscribe the address it was sent to. Email apps' one-click
// unsubscribe button calls the function directly (List-Unsubscribe-Post).
const FUNCTIONS_BASE_URL =
  process.env.MIMIS_FUNCTIONS_BASE_URL || 'https://igchqqyassrfpsliyjec.supabase.co/functions/v1';

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const e = typeof body?.e === 'string' ? body.e.slice(0, 254) : '';
  const t = typeof body?.t === 'string' ? body.t.slice(0, 64) : '';
  if (!e || !t) return NextResponse.json({ ok: false, error: 'This unsubscribe link is incomplete.' }, { status: 400 });
  try {
    const upstream = await fetch(`${FUNCTIONS_BASE_URL}/email-webhook?action=unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-agent': request.headers.get('user-agent') || '',
        'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
      },
      body: JSON.stringify({ e, t }),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error('unsubscribe proxy failed', err);
    return NextResponse.json({ ok: false, error: 'Could not reach the server. Please try again shortly.' }, { status: 502 });
  }
}
