
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
  
  console.log(`MIDDLEWARE: Path: ${pathname}, Cookie present: ${!!sessionCookie}`);

  const publicPaths = ['/login', '/signup'];

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  if (!sessionCookie) {
    console.log(`MIDDLEWARE: No session cookie for protected path '${pathname}'. Redirecting to login.`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await verifySessionCookie(sessionCookie);
    console.log(`MIDDLEWARE: Session cookie verified successfully for path '${pathname}'.`);
    return NextResponse.next();
  } catch (error) {
    console.log(`MIDDLEWARE: Session cookie verification failed for path '${pathname}'. Redirecting to login.`);
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
