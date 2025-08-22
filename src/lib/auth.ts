
import { getAdmin } from "@/lib/firebase-admin";
import type { NextRequest } from "next/server";

export async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const idToken = authHeader.split("Bearer ")[1];
    try {
        const { auth } = getAdmin();
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.error("Error verifying ID token:", error);
        return null;
    }
}
