
import { NextRequest, NextResponse } from "next/server";
import { generateMealSuggestions } from "@/ai/flows/generate-meal-suggestions";
import { MealSuggestionInput } from "@/ai/schemas/meal-suggestions";
import { getUserIdFromCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const input: MealSuggestionInput = await request.json();
    
    const result = await generateMealSuggestions(input);
    
    if (typeof result === 'string') {
        // The AI result is often a JSON string within Markdown, so we just return the raw string.
        // The client will be responsible for parsing it.
        return new NextResponse(result, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    } else {
        return new NextResponse(JSON.stringify(result), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    console.error("Error in /api/ai/meal-suggestions POST:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: "Failed to generate meal suggestions", details: errorMessage }), { status: 500 });
  }
}
