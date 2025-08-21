
import { NextRequest, NextResponse } from "next/server";
import { handleGenerateSuggestionsForApi } from "@/app/actions";
import { getUserIdFromToken } from "@/lib/auth";
import { InventoryItem } from "@/lib/types";

export async function POST(request: NextRequest) {
    console.log("Received request for /api/ai/meal-suggestions");
    
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            console.error("Unauthorized: No user ID found from token.");
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        console.log("Authenticated User ID:", userId);

        const body = await request.json();
        console.log("Request Body:", body);
        const { inventory, cravings } = body;

        if (!inventory) {
             console.error("Bad Request: Missing inventory in request body.");
            return new NextResponse(JSON.stringify({ error: "Missing required field: inventory" }), { status: 400 });
        }
        
        const result = await handleGenerateSuggestionsForApi(userId, inventory, cravings || "");

        if (result.error) {
            console.error("Error from handleGenerateSuggestionsForApi:", result.error);
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        console.log("Successfully generated meal suggestions.");
        return NextResponse.json(result);

    } catch (error) {
        console.error(`Error in /api/ai/meal-suggestions POST:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to generate suggestions", details: errorMessage }), { status: 500 });
    }
}
