
import { NextRequest, NextResponse } from "next/server";
import { getClientSavedRecipes, handleSaveRecipe } from "@/app/actions";
import type { Recipe } from "@/lib/types";
import { getUserIdFromCookie } from "@/lib/auth";
import { saveRecipe as dataSaveRecipe } from "@/lib/data";
import { db } from "@/lib/firebase-admin";


export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromCookie();
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
        const userId = await getUserIdFromCookie();
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const recipe: Recipe = await request.json();
        await dataSaveRecipe(db, userId, recipe);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in /api/saved-recipes POST:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to save recipe", details: errorMessage }), { status: 500 });
    }
}
