
"use server";

import { getAdmin } from "@/lib/firebase-admin";
import type { Firestore, FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import type { InventoryItem, LeftoverDestination, Recipe, Substitution, StorageLocation, Settings, PersonalDetails, MarkPrivateRequest, MoveRequest, SpoilageRequest, Household, RequestedItem, ShoppingListItem, NewInventoryItem, ItemMigrationMapping, DailyMacros } from "@/lib/types";
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
    getStorageLocations as dataGetStorageLocations, 
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
    rejectPendingMember as dataRejectMember,
    getHousehold as dataGetHousehold,
    processLeaveRequest as dataProcessLeaveRequest,
    getShoppingList,
    addShoppingListItem,
    updateShoppingListItem,
    removeShoppingListItem,
    removeCheckedShoppingListItems,
    toggleItemPrivacy as dataToggleItemPrivacy,
    getPendingMemberInventory,
} from "@/lib/data";
import { addDays, differenceInDays, parseISO } from "date-fns";
import { generateSuggestions, SuggestionRequest } from "@/ai/flows/suggestion-flow";


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

// This is the core server action for meal suggestions, used by the web UI.
export async function handleGenerateSuggestions(formData: FormData) {
    try {
        const userId = await getCurrentUserId();
        const { db } = getAdmin();

        // Extract data from FormData
        const inventoryString = formData.get('inventory') as string;
        const cravings = formData.get('cravingsOrMood') as string;

        if (!inventoryString) {
            return { error: { form: ["Inventory data is missing."] }, suggestions: null };
        }
        
        const inventory: InventoryItem[] = JSON.parse(inventoryString, (key, value) => {
            if (key === 'expiryDate' && value) {
                return new Date(value);
            }
            return value;
        });

        // Fetch required user data
        const personalDetails = await dataGetPersonalDetails(db, userId);
        const settings = await dataGetSettings(db, userId);
        const todaysMacros = await getTodaysMacros(db, userId);

        // Helper function to format inventory for the prompt
        const formatInventory = (inventory: InventoryItem[]) => {
            const now = new Date();
            if (inventory.length === 0) return "The user's inventory is empty.";
            return inventory
                .filter(item => item.totalQuantity > 0)
                .map(item => {
                    let expiryInfo = 'No expiry date';
                    if (item.expiryDate) {
                        const expiryDate = item.expiryDate instanceof Date ? item.expiryDate : parseISO(item.expiryDate as any);
                        const daysUntilExpiry = differenceInDays(expiryDate, now);
                        if (daysUntilExpiry < 0) {
                            expiryInfo = `Expired ${-daysUntilExpiry} days ago`;
                        } else if (daysUntilExpiry === 0) {
                            expiryInfo = 'Expires today';
                        } else {
                            expiryInfo = `Expires in ${daysUntilExpiry} days`;
                        }
                    }
                    return `${item.name}: ${item.totalQuantity.toFixed(2)} ${item.unit} available. ${expiryInfo}.`;
                })
                .join('\n');
        };

        // Helper function to format macros for the prompt
        const formatTodaysMacros = (macros: DailyMacros[]) => {
            if (macros.length === 0) return "No meals logged yet today.";
            const totals = macros.reduce((acc, meal) => {
                acc.protein += meal.totals.protein;
                acc.carbs += meal.totals.carbs;
                acc.fat += meal.totals.fat;
                return acc;
            }, { protein: 0, carbs: 0, fat: 0 });

            return `So far today, the user has consumed:
- Protein: ${totals.protein.toFixed(1)}g
- Carbs: ${totals.carbs.toFixed(1)}g
- Fat: ${totals.fat.toFixed(1)}g
`;
        };

        // Prepare the request for the Genkit flow
        const suggestionRequest: SuggestionRequest = {
            inventory: inventory.map(item => ({
                ...item,
                expiryDate: item.expiryDate ? item.expiryDate.toISOString() : null,
            })),
            personalDetails,
            settings,
            todaysMacros: todaysMacros.map(macro => ({
                ...macro,
                loggedAt: macro.loggedAt.toISOString(),
            })),
            cravings: cravings || "User has no specific cravings. Suggest a variety of healthy meals.",
            formattedTodaysMacros: formatTodaysMacros(todaysMacros),
            formattedInventory: formatInventory(inventory),
        };

        const suggestions = await generateSuggestions(suggestionRequest);

        return { error: null, suggestions: suggestions };

    } catch (e) {
        console.error("Error in handleGenerateSuggestions:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while generating suggestions.";
        return { error: { form: [errorMessage] }, suggestions: null };
    }
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

export async function handleUpdateInventoryGroup(originalItems: InventoryItem[], formData: { [key: string]: { full: number; partial: number } }, itemName: string, unit: 'g' | 'kg' | 'ml' | 'l' | 'pcs' | 'oz' | 'lbs' | 'fl oz' | 'gallon'): Promise<{ success: boolean; error: string | null; newInventory?: {privateItems: InventoryItem[], sharedItems: InventoryItem[]} }> {
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
                    updates.push(dataAddInventoryItem(db, userId, { name: itemName, originalQuantity: size, totalQuantity: size, unit: unit, expiryDate: addDays(new Date(), 7), locationId: originalItems[0]?.locationId || 'pantry-1', isPrivate: originalItems[0]?.isPrivate }));
                }
            } else if (newFullCount < currentFullCount) {
                const toRemove = currentFullCount - newFullCount;
                for (let i = 0; i < toRemove; i++) {
                    updates.push(dataRemoveInventoryItem(db, userId, existingFullPackages[i]));
                }
            }

            if (existingPartialPackage) {
                if (newPartialQty > 0) {
                    if (existingPartialPackage.totalQuantity !== newPartialQty) {
                        updates.push(dataUpdateInventoryItem(db, userId, { ...existingPartialPackage, totalQuantity: newPartialQty }));
                    }
                } else {
                    updates.push(dataRemoveInventoryItem(db, userId, existingPartialPackage));
                }
            } else if (newPartialQty > 0) {
                 updates.push(dataAddInventoryItem(db, userId, { name: itemName, originalQuantity: size, totalQuantity: newPartialQty, unit: unit, expiryDate: addDays(new Date(), 7), locationId: originalItems[0]?.locationId || 'pantry-1', isPrivate: originalItems[0]?.isPrivate }));
            }
        }
        await Promise.all(updates);
        const newInventory = await getInventory(db, userId);
        return { success: true, error: null, newInventory: {privateItems: newInventory.privateItems, sharedItems: newInventory.sharedItems} };
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

export async function handleRemoveInventoryPackageGroup(itemsToRemove: InventoryItem[]): Promise<{ success: boolean; error: string | null; newInventory?: {privateItems: InventoryItem[], sharedItems: InventoryItem[]} }> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    try {
        await dataRemoveInventoryItems(db, userId, itemsToRemove);
        const newInventory = await getInventory(db, userId);
        return { success: true, error: null, newInventory };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred." };
    }
}

export async function handleMoveInventoryItems(request: MoveRequest, destinationId: string): Promise<{ success: boolean; error: string | null; newInventory?: {privateItems: InventoryItem[], sharedItems: InventoryItem[]} }> {
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

export async function handleReportSpoilage(request: SpoilageRequest): Promise<{ success: boolean; error: string | null; newInventory?: {privateItems: InventoryItem[], sharedItems: InventoryItem[]} }> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    try {
        const updates: Promise<any>[] = [];
        for (const sizeStr in request) {
            const spoilage = request[Number(sizeStr)];
            const { fullPackagesToSpoil, partialAmountToSpoil, source } = spoilage;
            if (fullPackagesToSpoil > 0) {
                source.fullPackages.slice(0, fullPackagesToSpoil).forEach(pkg => updates.push(dataRemoveInventoryItem(db, userId, pkg)));
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

export async function handleToggleItemPrivacy(items: InventoryItem[], makePrivate: boolean): Promise<{ success: boolean; error: string | null; newInventory?: {privateItems: InventoryItem[], sharedItems: InventoryItem[]} }> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    try {
        const household = await dataGetHousehold(db, userId);
        if (!household) {
            return { success: false, error: "You must be in a household to change item privacy." };
        }
        await dataToggleItemPrivacy(db, userId, household.id, items, makePrivate);
        const newInventory = await getInventory(db, userId);
        return { success: true, newInventory, error: null };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred." };
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
    return dataGetStorageLocations(db, userId);
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

export async function addClientInventoryItem(item: NewInventoryItem) {
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

// --- Shopping List Actions ---
export async function getClientShoppingList(): Promise<ShoppingListItem[]> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return getShoppingList(db, userId);
}

export async function addClientShoppingListItem(item: Omit<ShoppingListItem, 'id' | 'addedAt'>): Promise<ShoppingListItem> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return addShoppingListItem(db, userId, item);
}

export async function updateClientShoppingListItem(item: ShoppingListItem): Promise<ShoppingListItem> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return updateShoppingListItem(db, userId, item);
}

export async function removeClientShoppingListItem(itemId: string): Promise<{ id: string }> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return removeShoppingListItem(db, userId, itemId);
}

export async function removeClientCheckedShoppingListItems(): Promise<void> {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    return removeCheckedShoppingListItems(db, userId);
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
        const household = await dataGetHousehold(db, userId);
        if (!household) return null;
        const { sharedItems } = await getInventory(db, userId);
        return { ...household, sharedInventory: sharedItems };
    } catch (error) {
        console.error("Error fetching client household:", error);
        return null;
    }
}

// This is a new action to get a household by its invite code
// It's needed for the join flow before the user is actually a member.
export async function getHouseholdByInviteCode(inviteCode: string): Promise<Household | null> {
    const { db } = getAdmin();
    const q = db.collection('households').where('inviteCode', '==', inviteCode.toUpperCase()).limit(1);
    const snapshot = await q.get();
    if (snapshot.empty) {
        return null;
    }
    const doc = snapshot.docs[0];
    const data = doc.data() as Household;

    // We also need to fetch locations for the mapping dialog
    const locationsSnapshot = await doc.ref.collection('storage-locations').get();
    const locations = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StorageLocation));
    
    return { ...data, id: doc.id, locations };
}


export async function handleCreateHousehold() {
    const userId = await getCurrentUserId();
    const { db } = getAdmin();
    const userSettings = await dataGetSettings(db, userId);
    const ownerName = userSettings.displayName || "Owner";
    const inviteCode = generateInviteCode();
    try {
        const userLocations = await dataGetStorageLocations(db, userId);
        const household = await dataCreateHousehold(db, userId, ownerName, inviteCode, userLocations);
        return { success: true, household };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function handleJoinHousehold(inviteCode: string, mergeInventory: boolean, itemMigrationMapping: ItemMigrationMapping) {
    const userId = await getCurrentUserId();
    const { db, FieldValue } = getAdmin();
    const userSettings = await dataGetSettings(db, userId);
    const userName = userSettings.displayName || "New Member";
     try {
        const household = await dataJoinHousehold(db, FieldValue.arrayUnion, userId, userName, inviteCode.toUpperCase(), mergeInventory, itemMigrationMapping);
        return { success: true, household, pending: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function handleLeaveHousehold(itemsToTake: RequestedItem[], newOwnerId: string | undefined, locationMapping: Record<string, string>) {
    const userId = await getCurrentUserId();
    const { db, FieldValue } = getAdmin();
    try {
        await dataLeaveHousehold(db, FieldValue.arrayRemove, FieldValue.arrayUnion, userId, newOwnerId, itemsToTake, locationMapping);
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function handleReviewLeaveRequest(requestId: string, approve: boolean) {
    const userId = await getCurrentUserId();
    const { db, FieldValue } = getAdmin();
    try {
        const updatedHousehold = await dataProcessLeaveRequest(db, FieldValue.arrayRemove, userId, requestId, approve);
        return { success: true, household: updatedHousehold };
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

export async function handleApproveAndMerge(householdId: string, memberIdToApprove: string, approvedItemIds: string[]) {
    const currentUserId = await getCurrentUserId();
    const { db, FieldValue } = getAdmin();
    try {
        const updatedHousehold = await dataApproveAndMergeMember(db, FieldValue.arrayUnion, FieldValue.arrayRemove, currentUserId, householdId, memberIdToApprove, approvedItemIds);
        return { success: true, household: updatedHousehold };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function handleRejectMember(householdId: string, memberIdToReject: string) {
     const currentUserId = await getCurrentUserId();
     const { db, FieldValue } = getAdmin();
    try {
        const updatedHousehold = await dataRejectMember(db, FieldValue.arrayRemove, currentUserId, householdId, memberIdToReject);
        return { success: true, household: updatedHousehold };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function getClientPendingMemberInventory(memberId: string): Promise<InventoryItem[]> {
    const currentUserId = await getCurrentUserId();
    const { db } = getAdmin();
    return getPendingMemberInventory(db, currentUserId, memberId);
}
