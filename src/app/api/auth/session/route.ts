
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { initFirebaseAdmin, getAdmin } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  initFirebaseAdmin();
  const { getAuth } = require('firebase-admin/auth');
  const { idToken } = await request.json();

  if (!idToken) {
    return new NextResponse(JSON.stringify({ error: "ID token is required" }), { status: 400 });
  }

  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

  try {
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
    
    const response = new NextResponse(JSON.stringify({ success: true }), { status: 200 });
    response.cookies.set({
      name: "__session",
      value: sessionCookie,
      maxAge: expiresIn / 1000, // seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error("Session API: Error creating session cookie:", error);
    return new NextResponse(JSON.stringify({ error: "Failed to create session" }), { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  const response = new NextResponse(JSON.stringify({ success: true }), { status: 200 });
  response.cookies.set({
    name: "__session",
    value: "",
    maxAge: 0,
    path: "/",
  });
  return response;
}
