
import { NextRequest, NextResponse } from "next/server";
import { handleGenerateRecipeDetails } from "@/app/actions";
import { getUserIdFromToken } from "@/lib/auth";
import type { Recipe } from "@/lib/types";


export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const recipeData: Omit<Recipe, "servings" | "macros" | "parsedIngredients"> = await request.json();
        
        if (!recipeData.title || !recipeData.ingredients || !recipeData.instructions) {
            return new NextResponse(JSON.stringify({ error: "Missing required fields for generating recipe details." }), { status: 400 });
        }
        
        const result = await handleGenerateRecipeDetails(recipeData);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error(`Error in /api/ai/recipe-details POST:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to generate recipe details", details: errorMessage }), { status: 500 });
    }
}
