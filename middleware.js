import { NextResponse } from 'next/server';

// Exposes the current path to server components as a header.
//
// The root layout needs to know which route is rendering so it can skip the
// theme shell on admin screens -- otherwise the storefront's header and footer
// wrap the admin tools, which is both confusing and makes the editor hard to
// use. App Router layouts don't receive the pathname, and a layout can't read
// searchParams, so a middleware header is the supported way to get it.

// One canonical hostname.
//
// The storefront answers on several hosts -- the brand domain, the agency
// subdomain, and Vercel's generated *.vercel.app alias. Identical content on
// several hostnames splits search ranking between them and lets the wrong one
// get indexed, so everything 308s to the canonical host.
//
// Override per-environment with CANONICAL_HOST if the brand domain ever changes.
const CANONICAL_HOST = process.env.CANONICAL_HOST || 'www.mimispizzami.com';

function shouldRedirect(request) {
  // Production only. Preview deployments get their own hostnames by design, and
  // redirecting them to production would make every preview untestable.
  if (process.env.VERCEL_ENV !== 'production') return false;

  const host = request.headers.get('host') || '';
  if (!host || host === CANONICAL_HOST) return false;

  // NEVER redirect API routes. Clover's payment webhook and the Edge Function
  // callbacks POST straight to /api/*; not every client follows a 308 on a POST,
  // and one that doesn't would silently drop a paid order.
  if (request.nextUrl.pathname.startsWith('/api/')) return false;

  return true;
}

export function middleware(request) {
  if (shouldRedirect(request)) {
    const url = new URL(request.url);
    url.host = CANONICAL_HOST;
    url.protocol = 'https:';
    url.port = '';
    // 308 keeps the method and tells search engines the move is permanent.
    return NextResponse.redirect(url, 308);
  }

  const headers = new Headers(request.headers);
  headers.set('x-mimis-path', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Skip static assets and image optimisation -- they never render a layout.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
};
