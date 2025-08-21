import { NextRequest, NextResponse } from "next/server";
import { handleGenerateSuggestionsForApi } from "@/app/actions";
import { getUserIdFromToken } from "@/lib/auth";
import type { InventoryItem } from "@/lib/types";

export async function POST(request: NextRequest) {
  console.log("[Meal Suggestions API] Received request");

  try {
    // Get UID from session cookie / Authorization header
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      console.error("[Meal Suggestions API] Unauthorized: No user ID found from token.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[Meal Suggestions API] Authenticated User ID:", userId);

    // Parse request body
    const body = await request.json();
    console.log("[Meal Suggestions API] Request Body:", body);

    const { inventory, cravings } = body;

    if (!inventory || !Array.isArray(inventory)) {
      console.error("[Meal Suggestions API] Bad Request: Missing or invalid inventory.");
      return NextResponse.json({ error: "Missing or invalid field: inventory" }, { status: 400 });
    }

    // Call your server-side suggestion generator
    const result = await handleGenerateSuggestionsForApi(userId, inventory as InventoryItem[], cravings || "");

    if (result.error) {
      console.error("[Meal Suggestions API] Error generating suggestions:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log("[Meal Suggestions API] Successfully generated meal suggestions");
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("[Meal Suggestions API] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: "Failed to generate suggestions", details: errorMessage }, { status: 500 });
  }
}
