
'use server';

import type { NextRequest } from "next/server";
import { getAdmin } from "@/lib/firebase-admin";

/**
 * Verifies the ID token from an Authorization header and returns the user's UID.
 * @param request The NextRequest object.
 * @returns The user's UID if the token is valid, otherwise null.
 */
export async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get("Authorization");
    
    // Safely check if the header exists and starts with "Bearer "
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith("Bearer ")) {
        console.warn("getUserIdFromToken: Missing or invalid Authorization header.");
        return null;
    }
    
    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) {
        console.warn("getUserIdFromToken: Bearer token is missing.");
        return null;
    }

    try {
        const { auth } = getAdmin();
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.error("Error verifying ID token in getUserIdFromToken:", error);
        return null;
    }
}
