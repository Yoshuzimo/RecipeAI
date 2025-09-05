
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
