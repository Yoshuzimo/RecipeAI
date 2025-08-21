'use server';

import type { NextRequest } from "next/server";
import { getAdmin } from "@/lib/firebase-admin";

/**
 * Verifies the ID token from either the Authorization header (Bearer) or __session cookie.
 * Returns the user's UID if valid, otherwise null.
 */
export async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
  try {
    const { auth } = getAdmin();

    // 1. Try Authorization header first
    const authHeader = request.headers.get("Authorization");
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      if (idToken) {
        const decoded = await auth.verifyIdToken(idToken);
        return decoded.uid;
      }
    }

    // 2. Fall back to __session cookie
    const sessionCookie = request.cookies.get("__session")?.value;
    if (sessionCookie) {
      const decoded = await auth.verifySessionCookie(sessionCookie, true);
      return decoded.uid;
    }

    console.warn("[Auth] No valid token or session cookie found.");
    return null;
  } catch (error) {
    console.error("[Auth] Error verifying token/session:", error);
    return null;
  }
}
