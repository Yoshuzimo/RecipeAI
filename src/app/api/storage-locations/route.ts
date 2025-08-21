
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase-admin";
import { getStorageLocations, addStorageLocation } from "@/lib/data";
import type { StorageLocation } from "@/lib/types";

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

export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { db } = getAdmin();
        const locations = await getStorageLocations(db, userId);
        return NextResponse.json(locations);

    } catch (error) {
        console.error("Error in /api/storage-locations GET:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to fetch storage locations", details: errorMessage }), { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const newLocationData: Omit<StorageLocation, 'id'> = await request.json();
        if (!newLocationData || !newLocationData.name || !newLocationData.type) {
             return new NextResponse(JSON.stringify({ error: "Invalid location data provided" }), { status: 400 });
        }

        const { db } = getAdmin();
        const newLocation = await addStorageLocation(db, userId, newLocationData);

        return NextResponse.json(newLocation, { status: 201 });

    } catch (error) {
        console.error("Error in /api/storage-locations POST:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to add storage location", details: errorMessage }), { status: 500 });
    }
}