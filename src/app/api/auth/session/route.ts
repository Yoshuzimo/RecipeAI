
import { getAuth } from "firebase-admin/auth";
import { initFirebaseAdmin } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Initialize Firebase Admin SDK
initFirebaseAdmin();

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();
  console.log("Session API: Received POST request.");

  if (!idToken) {
    console.error("Session API: ID token is missing from request body.");
    return new NextResponse(JSON.stringify({ error: "ID token is required" }), {
      status: 400,
    });
  }

  // Set session expiration to 5 days.
  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  try {
    console.log("Session API: Creating session cookie...");
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
    const options = {
      name: "__session",
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: '/',
    };
    
    console.log("Session API: Session cookie created. Setting cookie with options:", {
        name: options.name,
        maxAge: options.maxAge,
        httpOnly: options.httpOnly,
        secure: options.secure,
        path: options.path,
    });

    // Set cookie
    cookies().set(options);

    console.log("Session API: Cookie set successfully.");
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
    });
  } catch (error) {
    console.error("Session API: Error creating session cookie:", error);
    return new NextResponse(JSON.stringify({ error: "Failed to create session" }), {
      status: 401,
    });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    console.log("Session API: Received DELETE request. Clearing cookie.");
    cookies().delete('__session');
     return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
    });
  } catch (error) {
    console.error("Session API: Error deleting session cookie:", error);
    return new NextResponse(JSON.stringify({ error: "Failed to delete session" }), {
      status: 500,
    });
  }
}
