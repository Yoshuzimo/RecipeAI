
import { NextRequest, NextResponse } from "next/server";
import { getClientShoppingList, addClientShoppingListItem, removeClientCheckedShoppingListItems } from "@/app/actions";
import { getUserIdFromToken } from "@/lib/auth";
import type { ShoppingListItem } from "@/lib/types";

export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const shoppingList = await getClientShoppingList();
        return NextResponse.json(shoppingList);

    } catch (error) {
        console.error("Error in /api/shopping-list GET:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to fetch shopping list", details: errorMessage }), { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const newItemData: Omit<ShoppingListItem, 'id' | 'addedAt'> = await request.json();
        if (!newItemData || !newItemData.item) {
             return new NextResponse(JSON.stringify({ error: "Invalid item data provided" }), { status: 400 });
        }

        const newItem = await addClientShoppingListItem(newItemData);
        return NextResponse.json(newItem, { status: 201 });

    } catch (error) {
        console.error("Error in /api/shopping-list POST:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to add shopping list item", details: errorMessage }), { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        
        await removeClientCheckedShoppingListItems();
        return new NextResponse(null, { status: 204 });

    } catch (error)
        console.error("Error in /api/shopping-list DELETE:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to delete checked items", details: errorMessage }), { status: 500 });
    }
}
