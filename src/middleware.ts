import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware only checks if a session cookie exists, but does NOT verify it
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session')?.value;

  const publicPaths = ['/login', '/signup'];

  if (publicPaths.includes(pathname)) return NextResponse.next();

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verification is handled in API routes
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
