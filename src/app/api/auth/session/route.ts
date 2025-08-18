
import { getAuth } from "firebase-admin/auth";
import { initFirebaseAdmin } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Initialize Firebase Admin SDK
initFirebaseAdmin();

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  if (!idToken) {
    return new NextResponse(JSON.stringify({ error: "ID token is required" }), {
      status: 400,
    });
  }

  // Set session expiration to 5 days.
  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  try {
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
    
    const response = new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
    });

    response.cookies.set({
      name: "__session",
      value: sessionCookie,
      maxAge: expiresIn / 1000, // maxAge is in seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error("Session API: Error creating session cookie:", error);
    return new NextResponse(JSON.stringify({ error: "Failed to create session" }), {
      status: 401,
    });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const response = new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
    });
    // Clear the cookie by setting its maxAge to 0
    response.cookies.set({
      name: "__session",
      value: "",
      maxAge: 0,
      path: "/",
    });
     return response;
  } catch (error) {
    console.error("Session API: Error deleting session cookie:", error);
    return new NextResponse(JSON.stringify({ error: "Failed to delete session" }), {
      status: 500,
    });
  }
}
