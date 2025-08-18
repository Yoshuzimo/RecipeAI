
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')
  
  console.log(`Middleware: Path: ${pathname}, Has Session Cookie: ${!!sessionCookie}`);

  // Define public paths that don't require authentication
  const publicPaths = ['/login', '/signup']

  // If the user is trying to access a public path, let them through
  if (publicPaths.includes(pathname)) {
    console.log(`Middleware: Accessing public path ${pathname}. Allowing.`);
    return NextResponse.next()
  }

  // If there's no session cookie, redirect to the login page
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname) // Optionally pass the original path for redirection after login
    console.log(`Middleware: No session cookie. Redirecting to ${loginUrl.toString()}`);
    return NextResponse.redirect(loginUrl)
  }

  // Here you would typically verify the session cookie with your backend
  // For this example, we'll assume the presence of the cookie means the user is authenticated.
  // In a real app, you'd call a function like `verifySessionCookie(sessionCookie.value)`
  console.log(`Middleware: Session cookie found. Allowing access to ${pathname}.`);
  return NextResponse.next()
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
