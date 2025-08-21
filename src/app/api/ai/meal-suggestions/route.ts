import { NextRequest, NextResponse } from "next/server";
import { handleGenerateSuggestionsForApi } from "@/app/actions";
import { getUserIdFromToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        // Safely parse JSON body
        const body = await request.json().catch(() => null);
        if (!body) {
            return NextResponse.json(
                { error: "Invalid request body", suggestions: null },
                { status: 400 }
            );
        }

        const { inventory, cravings } = body;

        if (!inventory || !Array.isArray(inventory)) {
            return NextResponse.json(
                { error: "Inventory must be an array", suggestions: null },
                { status: 400 }
            );
        }

        // Safely get userId from token
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return NextResponse.json(
                { error: "Authentication required", suggestions: null },
                { status: 401 }
            );
        }

        const response = await handleGenerateSuggestionsForApi(userId, inventory, cravings || "");

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error in meal-suggestions API route:", error);
        return NextResponse.json(
            { error: "An unknown error occurred", suggestions: null },
            { status: 500 }
        );
    }
}
