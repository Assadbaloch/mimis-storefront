import { NextResponse } from 'next/server';

// Website chat (2026-10-25, CHATBOT_SPEC.md): server-only proxy to the
// chat-intake Supabase Edge Function. Same pattern as app/api/checkout and
// app/api/enroll: MIMIS_WEBHOOK_SECRET never reaches the browser, and the
// client IP comes from Vercel's own x-forwarded-for, not from the browser.
//   POST { action: 'start' | 'event' | 'submit', payload: {...} }
// Validation, rate limits and SMS consent recording happen in the database
// (mimis.chat_intake); this route only forwards.
const FUNCTIONS_BASE_URL =
  process.env.MIMIS_FUNCTIONS_BASE_URL || 'https://igchqqyassrfpsliyjec.supabase.co/functions/v1';

const ALLOWED_ORIGINS = new Set([
  'https://www.mimispizzami.com',
  'https://mimispizzami.com',
]);

export async function POST(request) {
  // Browsers always send Origin on a cross-site POST; refuse other sites.
  // (Same-origin requests from our own pages, and preview deployments on
  // *.vercel.app, are allowed.)
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.has(origin) && !/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) && !/^http:\/\/localhost(:\d+)?$/.test(origin)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const action = body?.action;
  if (!['start', 'event', 'submit'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'bad_action' }, { status: 400 });
  }

  const secret = process.env.MIMIS_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing MIMIS_WEBHOOK_SECRET env var');
    return NextResponse.json({ ok: false, error: 'Chat is unavailable right now. Please call the store.' }, { status: 500 });
  }

  try {
    const upstream = await fetch(`${FUNCTIONS_BASE_URL}/chat-intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Mimis-Webhook-Secret': secret },
      body: JSON.stringify({
        action,
        payload: body.payload && typeof body.payload === 'object' ? body.payload : {},
        client_ip: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || undefined,
        client_user_agent: (request.headers.get('user-agent') || '').slice(0, 300) || undefined,
      }),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(
      data && typeof data === 'object' ? data : { ok: false, error: 'Could not send right now. Please call the store.' },
      { status: upstream.status || 502 }
    );
  } catch (err) {
    console.error('chat proxy failed', err);
    return NextResponse.json({ ok: false, error: 'Could not send right now. Please call the store.' }, { status: 502 });
  }
}
