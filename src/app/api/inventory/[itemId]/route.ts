
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase-admin";
import { updateInventoryItem, removeInventoryItem, getInventory } from "@/lib/data";
import type { InventoryItem } from "@/lib/types";

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

async function findItemById(db: any, userId: string, itemId: string): Promise<InventoryItem | null> {
    const { privateItems, sharedItems } = await getInventory(db, userId);
    return [...privateItems, ...sharedItems].find(i => i.id === itemId) || null;
}

export async function PUT(request: NextRequest, { params }: { params: { itemId: string } }) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { itemId } = params;
        const updatedData: Partial<Omit<InventoryItem, 'id'>> = await request.json();

        const { db } = getAdmin();
        
        const existingItem = await findItemById(db, userId, itemId);
        if (!existingItem) {
            return new NextResponse(JSON.stringify({ error: "Item not found" }), { status: 404 });
        }

        const itemToUpdate: InventoryItem = { ...existingItem, ...updatedData };

        const updatedItem = await updateInventoryItem(db, userId, itemToUpdate);
        return NextResponse.json(updatedItem);

    } catch (error) {
        console.error(`Error in /api/inventory/${params.itemId} PUT:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to update item", details: errorMessage }), { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { itemId: string } }) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        
        const { itemId } = params;
        const { db } = getAdmin();

        const itemToDelete = await findItemById(db, userId, itemId);
        if (!itemToDelete) {
            return new NextResponse(JSON.stringify({ error: "Item not found or you do not have permission to delete it" }), { status: 404 });
        }

        await removeInventoryItem(db, userId, itemToDelete);
        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error(`Error in /api/inventory/${params.itemId} DELETE:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to delete item", details: errorMessage }), { status: 500 });
    }
}