import { auth } from "@/lib/firebase-admin";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function getUserIdFromCookie(): Promise<string | null> {
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) return null;
    
    try {
        const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
        return decodedToken.uid;
    } catch (error) {
        console.error("Error verifying session cookie:", error);
        return null;
    }
}

export async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
    const authorization = request.headers.get("Authorization");
    if (authorization?.startsWith("Bearer ")) {
      const idToken = authorization.split("Bearer ")[1];
      try {
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken.uid;
      } catch (error) {
        console.error("Error verifying ID token:", error);
        return null;
      }
    }
    return null;
}
