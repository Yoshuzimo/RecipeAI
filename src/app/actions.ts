
"use server";

import { cookies } from "next/headers";
import type { InventoryItem, LeftoverDestination, Recipe, Substitution, StorageLocation, Settings, PersonalDetails, MarkPrivateRequest, MoveRequest, SpoilageRequest, Household } from "@/lib/types";
import { 
    seedInitialData as dataSeedInitialData,
    getPersonalDetails as dataGetPersonalDetails,
    updateInventoryItem as dataUpdateInventoryItem,
    addInventoryItem as dataAddInventoryItem,
    removeInventoryItem as dataRemoveInventoryItem,
    getInventory, 
    logMacros, 
    updateMealTime as dataUpdateMealTime,
    saveRecipe as dataSaveRecipe,
    removeInventoryItems as dataRemoveInventoryItems,
    getStorageLocations, 
    getSavedRecipes, 
    getTodaysMacros, 
    addStorageLocation as dataAddStorageLocation,
    updateStorageLocation as dataUpdateStorageLocation,
    removeStorageLocation as dataRemoveStorageLocation,
    getSettings as dataGetSettings, 
    saveSettings as dataSaveSettings, 
    savePersonalDetails as dataSavePersonalDetails, 
    createHousehold as dataCreateHousehold, 
    joinHousehold as dataJoinHousehold, 
    leaveHousehold as dataLeaveHousehold, 
    approvePendingMember as dataApprovePendingMember, 
    approveAndMergeMember as dataApproveAndMergeMember,
    rejectPendingMember as dataRejectPendingMember,
    getHousehold as dataGetHousehold
} from "@/lib/data";
import { addDays } from "date-fns";
import { getAdmin } from "@/lib/firebase-admin";

// --- Server Actions ---

export async function getCurrentUserId(): Promise<string> {
    const { auth } = getAdmin();
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) {
        throw new Error("Authentication required. Please log in.");
    }
    try {
        const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
        return decodedToken.uid;
    } catch (error) {
        console.error("Error verifying session cookie in getCurrentUserId:", error);
        throw new Error("Your session has expired. Please log in again.");
    }
}

export async function seedUserData(userId: string): Promise<void> {
    const { db } = getAdmin();
    console.log(`ACTIONS: Starting seedUserData for user: ${userId}`);
    await dataSeedInitialData(db, userId);
}


// Placeholder AI-related functions
export async function handleGenerateSuggestions(formData: FormData) {
    return { error: { form: ["AI features are currently under maintenance. Please try again later."] }, suggestions: null, debugInfo: { promptInput: "", rawResponse: "" }};
}
export async function handleGenerateShoppingList(inventory: InventoryItem[], personalDetails: PersonalDetails) {
    return { error: "AI features are currently under maintenance. Please try again later.", shoppingList: null };
}
export async function handleGenerateSubstitutions(recipe: Recipe, ingredientsToReplace: string[], inventory: InventoryItem[], allowExternalSuggestions: boolean): Promise<{ substitutions: Substitution[] | null, error: string | null}> {
    return { substitutions: null, error: "AI features are currently under maintenance. Please try again later." };
}
export async function handleGenerateRecipeDetails(recipeData: Omit<Recipe, "servings" | "macros" | "parsedIngredients">): Promise<{ recipe: Recipe | null, error: string | null}> {
    return { recipe: null, error: "AI features are currently under maintenance. Please try again later." };
}


// Inventory & Meal Logging
export async function handleLogCookedMeal(recipe: Recipe, servingsEaten: number, servingsEatenByOthers: number, fridgeLeftovers: LeftoverDestination[], freezerLeftovers: LeftoverDestination[], mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack"): Promise<{ success: boolean; error: string | null; newInventory?: InventoryItem[] }> {
    return { success: false, error: "AI features are currently under maintenance. Please try again later." };
}

export async function handleUpdateInventoryGroup(originalItems: InventoryItem[], formData: { [key: string]: { full: number; partial: number } }, itemName: string, unit: 'g' | 'kg' | 'ml' | 'l' | 'pcs' | 'oz' | 'lbs' | 'fl oz' | 'gallon'): Promise<{ success: boolean; error: string | null; newInventory?: InventoryItem[] }> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    try {
        const updates: Promise<any>[] = [];
        for (const sizeStr in formData) {
            const size = Number(sizeStr);
            const { full: newFullCount, partial: newPartialQty } = formData[sizeStr];
            const existingFullPackages = originalItems.filter(i => i.originalQuantity === size && i.totalQuantity === size);
            const existingPartialPackage = originalItems.find(i => i.originalQuantity === size && i.totalQuantity < size);
            const currentFullCount = existingFullPackages.length;

            if (newFullCount > currentFullCount) {
                const toAdd = newFullCount - currentFullCount;
                for (let i = 0; i < toAdd; i++) {
                    updates.push(dataAddInventoryItem(db, userId, { name: itemName, originalQuantity: size, totalQuantity: size, unit: unit, expiryDate: addDays(new Date(), 7), locationId: originalItems[0]?.locationId || 'pantry-1' }));
                }
            } else if (newFullCount < currentFullCount) {
                const toRemove = currentFullCount - newFullCount;
                for (let i = 0; i < toRemove; i++) {
                    updates.push(dataRemoveInventoryItem(db, userId, existingFullPackages[i].id));
                }
            }

            if (existingPartialPackage) {
                if (newPartialQty > 0) {
                    if (existingPartialPackage.totalQuantity !== newPartialQty) {
                        updates.push(dataUpdateInventoryItem(db, userId, { ...existingPartialPackage, totalQuantity: newPartialQty }));
                    }
                } else {
                    updates.push(dataRemoveInventoryItem(db, userId, existingPartialPackage.id));
                }
            } else if (newPartialQty > 0) {
                 updates.push(dataAddInventoryItem(db, userId, { name: itemName, originalQuantity: size, totalQuantity: newPartialQty, unit: unit, expiryDate: addDays(new Date(), 7), locationId: originalItems[0]?.locationId || 'pantry-1' }));
            }
        }
        await Promise.all(updates);
        const newInventory = await getInventory(db, userId);
        return { success: true, error: null, newInventory };
    } catch (e) {
        const error = e instanceof Error ? e.message : "An unknown error occurred.";
        return { success: false, error };
    }
}

export async function handleTransferItemToFridge(item: InventoryItem): Promise<InventoryItem> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    const today = new Date();
    const threeDaysFromNow = new Date(today.setDate(today.getDate() + 3));
    const newExpiryDate = item.expiryDate ? new Date(Math.min(threeDaysFromNow.getTime(), new Date(item.expiryDate).getTime())) : threeDaysFromNow;
    const updatedItem: InventoryItem = { ...item, name: item.name.replace(/\(Freezer\)/i, "(Fridge)").trim(), expiryDate: newExpiryDate };
    return await dataUpdateInventoryItem(db, userId, updatedItem);
}

export async function handleUpdateMealTime(mealId: string, newTime: string): Promise<{success: boolean, error?: string | null}> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    try {
        const updatedMeal = await dataUpdateMealTime(db, userId, mealId, newTime);
        return { success: !!updatedMeal, error: updatedMeal ? null : "Meal not found." };
    } catch(e) {
        return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred." };
    }
}

export async function handleSaveRecipe(recipe: Recipe): Promise<{ success: boolean; error?: string }> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    try {
        await dataSaveRecipe(db, userId, recipe);
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to save the recipe." };
    }
}

export async function handleRemoveInventoryPackageGroup(itemsToRemove: InventoryItem[]): Promise<{ success: boolean; error: string | null; newInventory?: InventoryItem[] }> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    try {
        await dataRemoveInventoryItems(db, userId, itemsToRemove.map(item => item.id));
        const newInventory = await getInventory(db, userId);
        return { success: true, error: null, newInventory };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred." };
    }
}

export async function handleMoveInventoryItems(request: MoveRequest, destinationId: string): Promise<{ success: boolean; error: string | null; newInventory?: InventoryItem[] }> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    try {
        const updates: Promise<any>[] = [];
        for (const sizeStr in request) {
            const move = request[Number(sizeStr)];
            const { fullPackagesToMove, partialAmountToMove, source } = move;
            if (fullPackagesToMove > 0) {
                source.fullPackages.slice(0, fullPackagesToMove).forEach(pkg => updates.push(dataUpdateInventoryItem(db, userId, { ...pkg, locationId: destinationId })));
            }
            if (partialAmountToMove > 0 && source.partialPackage) {
                updates.push(dataUpdateInventoryItem(db, userId, { ...source.partialPackage, totalQuantity: source.partialPackage.totalQuantity - partialAmountToMove }));
                updates.push(dataAddInventoryItem(db, userId, { ...source.partialPackage, totalQuantity: partialAmountToMove, locationId: destinationId }));
            }
        }
        await Promise.all(updates);
        const newInventory = await getInventory(db, userId);
        return { success: true, error: null, newInventory };
    } catch (e) {
        return { success: false, error: "Failed to move items." };
    }
}

export async function handleReportSpoilage(request: SpoilageRequest): Promise<{ success: boolean; error: string | null; newInventory?: InventoryItem[] }> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    try {
        const updates: Promise<any>[] = [];
        for (const sizeStr in request) {
            const spoilage = request[Number(sizeStr)];
            const { fullPackagesToSpoil, partialAmountToSpoil, source } = spoilage;
            if (fullPackagesToSpoil > 0) {
                source.fullPackages.slice(0, fullPackagesToSpoil).forEach(pkg => updates.push(dataRemoveInventoryItem(db, userId, pkg.id)));
            }
            if (partialAmountToSpoil > 0 && source.partialPackage) {
                updates.push(dataUpdateInventoryItem(db, userId, { ...source.partialPackage, totalQuantity: source.partialPackage.totalQuantity - partialAmountToSpoil }));
            }
        }
        await Promise.all(updates);
        const newInventory = await getInventory(db, userId);
        return { success: true, error: null, newInventory };
    } catch (e) {
        return { success: false, error: "Failed to report spoilage." };
    }
}

// Client Data Fetchers
export async function getClientInventory() {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return getInventory(db, userId);
}

export async function getClientStorageLocations() {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return getStorageLocations(db, userId);
}

export async function getClientSavedRecipes() {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return getSavedRecipes(db, userId);
}

export async function getClientPersonalDetails() {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return dataGetPersonalDetails(db, userId);
}

export async function savePersonalDetails(details: PersonalDetails) {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return dataSavePersonalDetails(db, userId, details);
}

export async function getClientTodaysMacros() {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return getTodaysMacros(db, userId);
}

export async function addClientInventoryItem(item: Omit<InventoryItem, 'id'>) {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return dataAddInventoryItem(db, userId, item);
}

export async function addClientStorageLocation(location: Omit<StorageLocation, 'id'>) {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return dataAddStorageLocation(db, userId, location);
}

export async function updateClientStorageLocation(location: StorageLocation) {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return dataUpdateStorageLocation(db, userId, location);
}

export async function removeClientStorageLocation(locationId: string) {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return dataRemoveStorageLocation(db, userId, locationId);
}

export async function getSettings() {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return dataGetSettings(db, userId);
}

export async function saveSettings(settings: Settings) {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return dataSaveSettings(db, userId, settings);
}

// --- Household Actions ---

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function getClientHousehold(): Promise<Household | null> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    try {
        return await dataGetHousehold(db, userId);
    } catch (error) {
        console.error("Error fetching client household:", error);
        return null;
    }
}

export async function handleCreateHousehold() {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    const userSettings = await dataGetSettings(db, userId);
    const ownerName = userSettings.displayName || "Owner";
    const inviteCode = generateInviteCode();
    try {
        const household = await dataCreateHousehold(db, userId, ownerName, inviteCode);
        return { success: true, household };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function handleJoinHousehold(inviteCode: string, mergeInventory: boolean) {
    const userId = await getCurrentUserId();
    const { db, FieldValue } = getAdmin();
    const userSettings = await dataGetSettings(db, userId);
    const userName = userSettings.displayName || "New Member";
     try {
        const household = await dataJoinHousehold(db, FieldValue.arrayUnion, userId, userName, inviteCode.toUpperCase(), mergeInventory);
        return { success: true, household, pending: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function handleLeaveHousehold(newOwnerId?: string) {
    const userId = await getCurrentUserId();
    const { db, FieldValue } = getAdmin();
    try {
        await dataLeaveHousehold(db, FieldValue.arrayRemove, userId, newOwnerId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function handleApproveMember(householdId: string, memberIdToApprove: string) {
    const currentUserId = await getCurrentUserId();
    const { db, FieldValue } = getAdmin();
    try {
        const updatedHousehold = await dataApprovePendingMember(db, FieldValue.arrayUnion, FieldValue.arrayRemove, currentUserId, householdId, memberIdToApprove);
        return { success: true, household: updatedHousehold };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function handleApproveAndMerge(householdId: string, memberIdToApprove: string) {
    const currentUserId = await getCurrentUserId();
    const { db, FieldValue } = getAdmin();
    try {
        const updatedHousehold = await dataApproveAndMergeMember(db, FieldValue.arrayUnion, FieldValue.arrayRemove, currentUserId, householdId, memberIdToApprove);
        return { success: true, household: updatedHousehold };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function handleRejectMember(householdId: string, memberIdToReject: string) {
     const currentUserId = await getCurrentUserId();
     const { db, FieldValue } = getAdmin();
    try {
        const updatedHousehold = await dataRejectPendingMember(db, FieldValue.arrayRemove, currentUserId, householdId, memberIdToReject);
        return { success: true, household: updatedHousehold };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}
