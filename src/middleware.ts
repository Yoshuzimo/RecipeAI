
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('__session')
  
  // Define public paths that don't require authentication
  const publicPaths = ['/login', '/signup']

  // If the user is trying to access a public path, let them through
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  // If there's no session cookie, redirect to the login page
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname) // Optionally pass the original path for redirection after login
    return NextResponse.redirect(loginUrl)
  }

  // Here you would typically verify the session cookie with your backend
  // For this example, we'll assume the presence of the cookie means the user is authenticated.
  // In a real app, you'd call a function like `verifySessionCookie(sessionCookie.value)`
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
