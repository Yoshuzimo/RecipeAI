
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase-admin";
import { handleLogCookedMeal } from "@/app/actions";
import type { Recipe, LeftoverDestination } from "@/lib/types";

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

        const { recipe, servingsEaten, servingsEatenByOthers, fridgeLeftovers, freezerLeftovers, mealType } = await request.json();
        
        if (!recipe || servingsEaten === undefined || servingsEatenByOthers === undefined || !fridgeLeftovers || !freezerLeftovers || !mealType) {
            return new NextResponse(JSON.stringify({ error: "Missing required fields for logging a meal." }), { status: 400 });
        }
        
        const result = await handleLogCookedMeal(recipe, servingsEaten, servingsEatenByOthers, fridgeLeftovers, freezerLeftovers, mealType);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error(`Error in /api/ai/log-meal POST:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to log meal", details: errorMessage }), { status: 500 });
    }
}
