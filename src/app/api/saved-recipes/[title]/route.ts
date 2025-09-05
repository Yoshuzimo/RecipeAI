
import { NextRequest, NextResponse } from "next/server";
import { handleRemoveSavedRecipe } from "@/app/actions";
import { getUserIdFromCookie } from "@/lib/auth";

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
    const result = await handleRemoveSavedRecipe(decodeURIComponent(title));

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
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
