import { NextResponse } from 'next/server';

// Exposes the current path to server components as a header.
//
// The root layout needs to know which route is rendering so it can skip the
// theme shell on admin screens -- otherwise the storefront's header and footer
// wrap the admin tools, which is both confusing and makes the editor hard to
// use. App Router layouts don't receive the pathname, and a layout can't read
// searchParams, so a middleware header is the supported way to get it.

export function middleware(request) {
  const headers = new Headers(request.headers);
  headers.set('x-mimis-path', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Skip static assets and image optimisation -- they never render a layout.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
};
