
import { NextRequest, NextResponse } from "next/server";
import { handleGenerateSubstitutions } from "@/app/actions";
import { getUserIdFromToken } from "@/lib/auth";
import type { Recipe, InventoryItem } from "@/lib/types";

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { recipe, ingredientsToReplace, inventory, allowExternalSuggestions } = await request.json();

        if (!recipe || !ingredientsToReplace || !inventory) {
            return new NextResponse(JSON.stringify({ error: "Missing required fields: recipe, ingredientsToReplace, and inventory" }), { status: 400 });
        }
        
        const result = await handleGenerateSubstitutions(recipe, ingredientsToReplace, inventory, allowExternalSuggestions);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error(`Error in /api/ai/substitutions POST:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to generate substitutions", details: errorMessage }), { status: 500 });
    }
}
