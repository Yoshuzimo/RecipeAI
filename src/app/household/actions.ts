
'use server';

import { getCurrentUserId } from "@/app/actions";
import { createHousehold, joinHousehold, leaveHousehold } from "@/lib/data";

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}


export async function handleCreateHousehold() {
    const userId = await getCurrentUserId();
    const inviteCode = generateInviteCode();
    try {
        const household = await createHousehold(userId, inviteCode);
        return { success: true, household };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}

export async function handleJoinHousehold(inviteCode: string) {
    const userId = await getCurrentUserId();
     try {
        const household = await joinHousehold(userId, inviteCode);
        return { success: true, household };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}

export async function handleLeaveHousehold() {
    const userId = await getCurrentUserId();
    try {
        await leaveHousehold(userId);
        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}
