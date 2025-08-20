import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'experimental-edge'; // 👈 Explicitly declare Edge runtime

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const search = request.nextUrl.search ?? '';
  const sessionCookie = request.cookies.get('__session')?.value;

  const publicPaths = ['/login', '/signup'];

  // Allow access to public paths regardless of authentication status.
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // If there's no session cookie, redirect to the login page for any protected route.
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the original path and query parameters
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // If a session cookie exists, let the request proceed.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
