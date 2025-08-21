
import { NextRequest, NextResponse } from "next/server";
import { updateClientShoppingListItem, removeClientShoppingListItem } from "@/app/actions";
import { getUserIdFromToken } from "@/lib/auth";
import type { ShoppingListItem } from "@/lib/types";

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
