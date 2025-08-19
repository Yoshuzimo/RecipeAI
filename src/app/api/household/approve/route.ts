
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase-admin";
import { handleApproveMember, handleApproveAndMerge } from "@/app/actions";

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

        const { householdId, memberIdToApprove, mergeInventory } = await request.json();

        if (!householdId || !memberIdToApprove) {
            return new NextResponse(JSON.stringify({ error: "Missing required fields: householdId and memberIdToApprove" }), { status: 400 });
        }
        
        let result;
        if (mergeInventory) {
            result = await handleApproveAndMerge(householdId, memberIdToApprove);
        } else {
            result = await handleApproveMember(householdId, memberIdToApprove);
        }

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error(`Error in /api/household/approve POST:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to approve member", details: errorMessage }), { status: 500 });
    }
}
