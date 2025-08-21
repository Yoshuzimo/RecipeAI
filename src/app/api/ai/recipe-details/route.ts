
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase-admin";
import { handleGenerateRecipeDetails } from "@/app/actions";
import type { Recipe } from "@/lib/types";

async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
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
