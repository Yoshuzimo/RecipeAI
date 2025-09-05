
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromCookie } from "@/lib/auth";
import { removeSavedRecipe as dataRemoveSavedRecipe } from "@/lib/data";
import { db } from "@/lib/firebase-admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { title: string } }
) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { title } = params;
    await dataRemoveSavedRecipe(db, userId, decodeURIComponent(title));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error in /api/saved-recipes/[title] DELETE:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return new NextResponse(
      JSON.stringify({
        error: "Failed to delete recipe",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}
