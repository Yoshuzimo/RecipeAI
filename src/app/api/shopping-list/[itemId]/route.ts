
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase-admin";
import { updateClientShoppingListItem, removeClientShoppingListItem } from "@/app/actions";
import type { ShoppingListItem } from "@/lib/types";

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

export async function PUT(request: NextRequest, { params }: { params: { itemId: string } }) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { itemId } = params;
        const updatedData: Omit<ShoppingListItem, 'id'> = await request.json();

        if (updatedData.checked === undefined || !updatedData.item) {
             return new NextResponse(JSON.stringify({ error: "Invalid item data provided" }), { status: 400 });
        }
        
        const itemToUpdate: ShoppingListItem = { id: itemId, ...updatedData };
        
        const updatedItem = await updateClientShoppingListItem(itemToUpdate);
        return NextResponse.json(updatedItem);

    } catch (error) {
        console.error(`Error in /api/shopping-list/${params.itemId} PUT:`, error);
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
        await removeClientShoppingListItem(itemId);
        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error(`Error in /api/shopping-list/${params.itemId} DELETE:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to delete item", details: errorMessage }), { status: 500 });
    }
}
