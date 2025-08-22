
import { NextRequest, NextResponse } from "next/server";
import { getClientSavedRecipes, handleSaveRecipe } from "@/app/actions";
import type { Recipe } from "@/lib/types";
import { getUserIdFromToken } from "@/lib/auth";


export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const savedRecipes = await getClientSavedRecipes();
        return NextResponse.json(savedRecipes);
    } catch (error) {
        console.error("Error in /api/saved-recipes GET:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to fetch saved recipes", details: errorMessage }), { status: 500 });
    }
}


export async function POST(request: NextRequest) {
     try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const recipe: Recipe = await request.json();
        const result = await handleSaveRecipe(recipe);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in /api/saved-recipes POST:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to save recipe", details: errorMessage }), { status: 500 });
    }
}
