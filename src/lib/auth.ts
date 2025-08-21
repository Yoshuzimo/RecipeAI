'use server';

import { cookies } from "next/headers";
import { getAdmin } from "@/lib/firebase-admin";

/**
 * Verifies the session cookie from the __session cookie and returns the user's UID.
 * @returns The user's UID if the session is valid, otherwise null.
 */
export async function getUserIdFromToken(): Promise<string | null> {
    try {
        const sessionCookie = cookies().get("__session")?.value;
        if (!sessionCookie) return null;

        const { auth } = getAdmin();
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch (error) {
        console.error("Error verifying session cookie:", error);
        return null;
    }
}
