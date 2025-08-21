
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase-admin";
import { getClientHousehold, handleCreateHousehold, handleLeaveHousehold } from "@/app/actions";

async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
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

export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const household = await getClientHousehold();
        return NextResponse.json(household);
    } catch (error) {
        console.error("Error in /api/household GET:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to fetch household", details: errorMessage }), { status: 500 });
    }
}

export async function POST(request: NextRequest) {
     try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const result = await handleCreateHousehold();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in /api/household POST:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to create household", details: errorMessage }), { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { itemsToTake, newOwnerId, locationMapping } = await request.json();

        if (!locationMapping) {
            return new NextResponse(JSON.stringify({ error: "Missing location mapping for leaving user's items." }), { status: 400 });
        }

        const result = await handleLeaveHousehold(itemsToTake || [], newOwnerId, locationMapping);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
        
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in /api/household DELETE:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to leave household", details: errorMessage }), { status: 500 });
    }
}
