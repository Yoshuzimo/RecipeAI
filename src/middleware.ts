
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// This function is defined but not used in the middleware directly
// It's a good practice to keep it separate in case you need complex verification later
// in a dedicated API route.
async function verifySessionCookie(sessionCookie: string) {
    const { getAdmin } = require("@/lib/firebase-admin");
    const { auth } = getAdmin();
    await auth.verifySessionCookie(sessionCookie, true);
}


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session')?.value;
  
  const publicPaths = ['/login', '/signup'];

  // Allow access to public paths regardless of authentication status.
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // If there's no session cookie, redirect to the login page for any protected route.
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If a session cookie exists, let the request proceed.
  // The actual verification of the cookie will happen in the server action or API route
  // that is called by the protected page. This is more efficient and secure.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
