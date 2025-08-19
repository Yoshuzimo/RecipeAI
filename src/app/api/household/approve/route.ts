
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase-admin";
import { handleApproveMember, handleApproveAndMerge, getClientPendingMemberInventory } from "@/app/actions";
import { InventoryItem } from "@/lib/types";

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

// This is a new route handler specifically for fetching a pending member's inventory
// to show in the confirmation dialog.
export async function GET(request: NextRequest) {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
        return new NextResponse(JSON.stringify({ error: "Missing memberId parameter" }), { status: 400 });
    }

    try {
        const inventory = await getClientPendingMemberInventory(memberId);
        return NextResponse.json(inventory);
    } catch (error) {
        console.error(`Error in /api/household/approve GET:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to fetch pending member inventory", details: errorMessage }), { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { householdId, memberIdToApprove, mergeInventory, approvedItemIds } = await request.json();

        if (!householdId || !memberIdToApprove) {
            return new NextResponse(JSON.stringify({ error: "Missing required fields: householdId and memberIdToApprove" }), { status: 400 });
        }
        
        let result;
        if (mergeInventory) {
            if (!approvedItemIds) {
                return new NextResponse(JSON.stringify({ error: "Missing approvedItemIds for merge operation" }), { status: 400 });
            }
            result = await handleApproveAndMerge(householdId, memberIdToApprove, approvedItemIds);
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
