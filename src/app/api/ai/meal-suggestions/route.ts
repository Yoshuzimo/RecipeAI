
import { NextRequest, NextResponse } from "next/server";
import { handleGenerateSuggestionsForApi } from "@/app/actions";
import { getUserIdFromToken } from "@/lib/auth";
import type { InventoryItem } from "@/lib/types";

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const body = await request.json();
        
        const { inventory, cravingsOrMood } = body;

        if (!inventory) {
             return new NextResponse(JSON.stringify({ error: "Inventory data is missing." }), { status: 400 });
        }
        
        const result = await handleGenerateSuggestionsForApi(userId, inventory, cravingsOrMood || "");

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
