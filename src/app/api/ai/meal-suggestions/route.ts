
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase-admin";
import { handleGenerateSuggestions } from "@/app/actions";
import type { InventoryItem } from "@/lib/types";

async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
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

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const body = await request.json();
        
        // The handleGenerateSuggestions action expects FormData.
        // We'll construct it manually from the JSON body.
        const formData = new FormData();
        
        if (body.cravingsOrMood) {
            formData.append('cravingsOrMood', body.cravingsOrMood);
        }
        if (body.inventory) {
            // The action expects the inventory as a JSON string.
            formData.append('inventory', JSON.stringify(body.inventory));
        }
        
        const result = await handleGenerateSuggestions(formData);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error(`Error in /api/ai/meal-suggestions POST:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to generate suggestions", details: errorMessage }), { status: 500 });
    }
}
