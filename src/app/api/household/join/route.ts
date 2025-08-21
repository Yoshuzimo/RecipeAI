
import { NextRequest, NextResponse } from "next/server";
import { handleJoinHousehold } from "@/app/actions";
import { getUserIdFromToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { inviteCode, mergeInventory, itemMigrationMapping } = await request.json();

        if (!inviteCode) {
            return new NextResponse(JSON.stringify({ error: "Missing required field: inviteCode" }), { status: 400 });
        }
        
        const result = await handleJoinHousehold(inviteCode, mergeInventory, itemMigrationMapping || {});

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error(`Error in /api/household/join POST:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to join household", details: errorMessage }), { status: 500 });
    }
}
