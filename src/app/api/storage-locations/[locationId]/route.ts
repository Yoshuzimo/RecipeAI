
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase-admin";
import { updateStorageLocation, removeStorageLocation } from "@/lib/data";
import type { StorageLocation } from "@/lib/types";
import { getUserIdFromToken } from "@/lib/auth";


export async function PUT(request: NextRequest, { params }: { params: { locationId: string } }) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { locationId } = params;
        const updatedData: Omit<StorageLocation, 'id'> = await request.json();

        const { db } = getAdmin();
        const locationToUpdate: StorageLocation = { id: locationId, ...updatedData };

        const updatedLocation = await updateStorageLocation(db, userId, locationToUpdate);
        return NextResponse.json(updatedLocation);

    } catch (error) {
        console.error(`Error in /api/storage-locations/${params.locationId} PUT:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to update location", details: errorMessage }), { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { locationId: string } }) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        
        const { locationId } = params;
        const { db } = getAdmin();

        await removeStorageLocation(db, userId, locationId);
        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error(`Error in /api/storage-locations/${params.locationId} DELETE:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to delete location", details: errorMessage }), { status: 500 });
    }
}
