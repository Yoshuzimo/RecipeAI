
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as admin from 'firebase-admin';

// This is a Next.js specific instruction to run this middleware in the Node.js environment,
// which is required for the Firebase Admin SDK to work.
export const runtime = 'nodejs';

function initFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return;
    }
    
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        // This will likely fail during build if the key is not set,
        // but it's a good practice to have a runtime check as well.
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set for middleware.');
    }
    
    const serviceAccount = JSON.parse(serviceAccountKey);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session')?.value;
  
  console.log(`MIDDLEWARE: Path: ${pathname}, Cookie present: ${!!sessionCookie}`);

  const publicPaths = ['/login', '/signup'];

  // Allow requests to public paths to proceed without checks.
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // For all other paths, a session cookie is required.
  if (!sessionCookie) {
    console.log(`MIDDLEWARE: No session cookie for protected path '${pathname}'. Redirecting to login.`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the session cookie for protected paths.
  try {
    initFirebaseAdmin();
    const { getAuth } = await import('firebase-admin/auth');
    await getAuth().verifySessionCookie(sessionCookie, true);
    console.log(`MIDDLEWARE: Session cookie verified successfully for path '${pathname}'.`);
    return NextResponse.next();
  } catch (error) {
    // If verification fails, redirect to login and clear the invalid cookie.
    console.log(`MIDDLEWARE: Session cookie verification failed for path '${pathname}'. Redirecting to login.`);
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
};
