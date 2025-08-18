
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuth } from 'firebase-admin/auth';
import { initFirebaseAdmin } from './lib/firebase-admin';

// This is a Next.js specific instruction to run this middleware in the Node.js environment,
// which is required for the Firebase Admin SDK to work.
export const runtime = 'nodejs'

// Initialize Firebase Admin SDK
initFirebaseAdmin();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')?.value
  
  const publicPaths = ['/login', '/signup']

  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Verify the session cookie. This is the crucial step.
    await getAuth().verifySessionCookie(sessionCookie, true);
    return NextResponse.next();
  } catch (error) {
    // Session cookie is invalid or expired.
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('__session');
    return response;
  }
}

// See "Matching Paths" below to learn more
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
}
