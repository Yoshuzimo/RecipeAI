
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdmin } from './lib/firebase-admin';

export const runtime = 'nodejs';

async function verifySessionCookie(sessionCookie: string) {
    const { auth } = getAdmin();
    await auth.verifySessionCookie(sessionCookie, true);
}


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session')?.value;
  
  const publicPaths = ['/login', '/signup'];

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await verifySessionCookie(sessionCookie);
    return NextResponse.next();
  } catch (error) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('__session');
    return response;
  }
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
