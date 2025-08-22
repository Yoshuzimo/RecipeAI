
import { NextRequest, NextResponse } from "next/server";
import { getHouseholdByInviteCode } from "@/app/actions";
import { Household, StorageLocation } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code;
    if (!code) {
      return new NextResponse(JSON.stringify({ error: "Invite code is required" }), {
        status: 400,
      });
    }

    const household = await getHouseholdByInviteCode(code);
    if (!household) {
      return new NextResponse(
        JSON.stringify({ error: "Household not found" }),
        { status: 404 }
      );
    }
    return NextResponse.json(household);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return new NextResponse(
      JSON.stringify({
        error: "Failed to fetch household by invite code",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}
