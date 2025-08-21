
import { NextRequest, NextResponse } from "next/server";
import { getInventory, addInventoryItem } from "@/lib/data";
import { getUserIdFromToken } from "@/lib/auth";
import { NewInventoryItem } from "@/lib/types";

export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const { db } = getAdmin();
        const inventory = await getInventory(db, userId);

        return NextResponse.json(inventory);

    } catch (error) {
        console.error("Error in /api/inventory GET:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to fetch inventory", details: errorMessage }), { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const newItemData: NewInventoryItem = await request.json();
        if (!newItemData || !newItemData.name || !newItemData.totalQuantity) {
             return new NextResponse(JSON.stringify({ error: "Invalid item data provided" }), { status: 400 });
        }

        const { db } = getAdmin();
        const newItem = await addInventoryItem(db, userId, newItemData);

        return NextResponse.json(newItem, { status: 201 });

    } catch (error) {
        console.error("Error in /api/inventory POST:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to add inventory item", details: errorMessage }), { status: 500 });
    }
}
