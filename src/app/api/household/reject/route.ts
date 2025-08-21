
import { NextRequest, NextResponse } from "next/server";
import { handleRejectMember } from "@/app/actions";
import { getUserIdFromToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { householdId, memberIdToReject } = await request.json();

        if (!householdId || !memberIdToReject) {
            return new NextResponse(JSON.stringify({ error: "Missing required fields: householdId and memberIdToReject" }), { status: 400 });
        }
        
        const result = await handleRejectMember(householdId, memberIdToReject);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error(`Error in /api/household/reject POST:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to reject member", details: errorMessage }), { status: 500 });
    }
}
