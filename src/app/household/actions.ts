
'use server';

import { getCurrentUserId } from "@/app/actions";
import { createHousehold, joinHousehold, leaveHousehold, approvePendingMember, rejectPendingMember, getSettings } from "@/lib/data";

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}


export async function handleCreateHousehold() {
    const userId = await getCurrentUserId();
    const userSettings = await getSettings(userId);
    const ownerName = userSettings.displayName || "Owner";
    const inviteCode = generateInviteCode();
    try {
        const household = await createHousehold(userId, ownerName, inviteCode);
        return { success: true, household };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}

export async function handleJoinHousehold(inviteCode: string) {
    const userId = await getCurrentUserId();
    const userSettings = await getSettings(userId);
    const userName = userSettings.displayName || "New Member";
     try {
        const household = await joinHousehold(userId, userName, inviteCode.toUpperCase());
        return { success: true, household, pending: true };
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

export async function handleApproveMember(householdId: string, memberIdToApprove: string) {
    const currentUserId = await getCurrentUserId();
    try {
        const updatedHousehold = await approvePendingMember(currentUserId, householdId, memberIdToApprove);
        return { success: true, household: updatedHousehold };
    } catch (error) {
         const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}

export async function handleRejectMember(householdId: string, memberIdToReject: string) {
     const currentUserId = await getCurrentUserId();
    try {
        const updatedHousehold = await rejectPendingMember(currentUserId, householdId, memberIdToReject);
        return { success: true, household: updatedHousehold };
    } catch (error) {
         const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}
