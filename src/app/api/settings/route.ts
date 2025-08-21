
import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/app/actions";
import { getUserIdFromToken } from "@/lib/auth";
import type { Settings } from "@/lib/types";

export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const settings = await getSettings();
        return NextResponse.json(settings);
    } catch (error) {
        console.error("Error in /api/settings GET:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to fetch settings", details: errorMessage }), { status: 500 });
    }
}

export async function POST(request: NextRequest) {
     try {
        const userId = await getUserIdFromToken(request);
        if (!userId) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const settings: Settings = await request.json();
        const savedSettings = await saveSettings(settings);
        return NextResponse.json(savedSettings);
    } catch (error) {
        console.error("Error in /api/settings POST:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new NextResponse(JSON.stringify({ error: "Failed to save settings", details: errorMessage }), { status: 500 });
    }
}
