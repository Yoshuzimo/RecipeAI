
'use server';

import type { Firestore, FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import type { InventoryItem, LeftoverDestination, Recipe, StorageLocation, Settings, PersonalDetails, MarkPrivateRequest, MoveRequest, SpoilageRequest, Household, RequestedItem, ShoppingListItem, NewInventoryItem, ItemMigrationMapping, Macros, PendingMeal, Unit, DailyMacros } from "@/lib/types";
import { db, auth } from "@/lib/firebase-admin";
import {
    seedInitialData as dataSeedInitialData,
    getPersonalDetails as dataGetPersonalDetails,
    updateInventoryItem as dataUpdateInventoryItem,
    addInventoryItem as dataAddInventoryItem,
    removeInventoryItem as dataRemoveInventoryItem,
    getInventory,
    logMacros as dataLogMacros,
    updateMealLog as dataUpdateMealLog,
    deleteMealLog as dataDeleteMealLog,
    saveRecipe as dataSaveRecipe,
    removeSavedRecipe as dataRemoveSavedRecipe,
    removeInventoryItems as dataRemoveInventoryItems,
    getStorageLocations as dataGetStorageLocations,
    getSavedRecipes as dataGetSavedRecipes,
    getHouseholdRecipes as dataGetHouseholdRecipes,
    getAllMacros as dataGetAllMacros,
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
    getHousehold as dataGetHousehold,
    processLeaveRequest as dataProcessLeaveRequest,
    getShoppingList as dataGetShoppingList,
    addShoppingListItem as dataAddShoppingListItem,
    updateShoppingListItem as dataUpdateShoppingListItem,
    removeShoppingListItem as dataRemoveShoppingListItem,
    removeCheckedShoppingListItems as dataRemoveCheckedShoppingListItems,
    toggleItemPrivacy as dataToggleItemPrivacy,
    getPendingMemberInventory,
    updateItemThreshold as dataUpdateItemThreshold,
    createPendingMeal as dataCreatePendingMeal,
    processMealConfirmation as dataProcessMealConfirmation,
} from "@/lib/data";
import { addDays } from "date-fns";
import { parseIngredient } from "@/lib/utils";
import { logManualMeal } from "@/ai/flows/log-manual-meal";


// --- Server Actions ---

export async function getCurrentUserId(): Promise<string> {
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
    console.log(`ACTIONS: Starting seedUserData for user: ${userId}`);
    await dataSeedInitialData(db, userId);
}


// A helper to normalize grams and milliliters for calculation
const normalizeToGramsOrML = (quantity: number, unit: Unit): number => {
    switch (unit) {
        case 'kg': return quantity * 1000;
        case 'l': return quantity * 1000;
        case 'lbs': return quantity * 453.592;
        case 'oz': return quantity * 28.3495;
        case 'gallon': return quantity * 3785.41;
        case 'fl oz': return quantity * 29.5735;
        default: return quantity; // g, ml, pcs
    }
}

export async function handleUpdateInventoryGroup(
    originalItems: InventoryItem[],
    formData: { [key: string]: { full: number; partial: number } },
    itemName: string,
    unit: Unit,
    nutritionData?: {
        servingSize: { quantity: number; unit: Unit };
        servingMacros: Macros
    }
): Promise<{ success: boolean; error: string | null; newInventory?: { privateItems: InventoryItem[], sharedItems: InventoryItem[] } }> {
    const userId = await getCurrentUserId();
    try {
        const updates: Promise<any>[] = [];
        
        let finalNutritionData: Pick<InventoryItem, 'macros' | 'servingSize' | 'servingMacros'> | undefined = undefined;
        if (nutritionData && nutritionData.servingSize.quantity > 0) {
            const { servingSize, servingMacros } = nutritionData;
            const normalizedServingSize = normalizeToGramsOrML(servingSize.quantity, servingSize.unit);
            const scaleFactor = 100 / normalizedServingSize;

            const normalizedMacros: Macros = {
                calories: servingMacros.calories * scaleFactor,
                protein: servingMacros.protein * scaleFactor,
                carbs: servingMacros.carbs * scaleFactor,
                fat: servingMacros.fat * scaleFactor,
                fiber: servingMacros.fiber ? servingMacros.fiber * scaleFactor : undefined,
                fats: servingMacros.fats ? {
                    saturated: servingMacros.fats.saturated ? servingMacros.fats.saturated * scaleFactor : undefined,
                    monounsaturated: servingMacros.fats.monounsaturated ? servingMacros.fats.monounsaturated * scaleFactor : undefined,
                    polyunsaturated: servingMacros.fats.polyunsaturated ? servingMacros.fats.polyunsaturated * scaleFactor : undefined,
                    trans: servingMacros.fats.trans ? servingMacros.fats.trans * scaleFactor : undefined,
                } : undefined,
            };
            
            finalNutritionData = {
                macros: normalizedMacros,
                servingSize: servingSize,
                servingMacros: servingMacros,
            }
        }


        for (const sizeStr in formData) {
            const size = Number(sizeStr);
            const { full: newFullCount, partial: newPartialQty } = formData[sizeStr];
            const existingFullPackages = originalItems.filter(i => i.originalQuantity === size && i.totalQuantity === size);
            const existingPartialPackage = originalItems.find(i => i.originalQuantity === size && i.totalQuantity < size);
            const currentFullCount = existingFullPackages.length;

            const newItemBase: Omit<NewInventoryItem, 'originalQuantity' | 'totalQuantity'> = {
                name: itemName,
                unit: unit,
                expiryDate: addDays(new Date(), 7),
                locationId: originalItems[0]?.locationId || 'pantry-1',
                isPrivate: originalItems[0]?.isPrivate,
                ...(finalNutritionData)
            };

            if (newFullCount > currentFullCount) {
                const toAdd = newFullCount - currentFullCount;
                for (let i = 0; i < toAdd; i++) {
                    updates.push(dataAddInventoryItem(db, userId, { ...newItemBase, originalQuantity: size, totalQuantity: size }));
                }
            } else if (newFullCount < currentFullCount) {
                const toRemove = currentFullCount - newFullCount;
                for (let i = 0; i < toRemove; i++) {
                    updates.push(dataRemoveInventoryItem(db, userId, existingFullPackages[i]));
                }
            }

            if (existingPartialPackage) {
                if (newPartialQty > 0) {
                    if (existingPartialPackage.totalQuantity !== newPartialQty || (finalNutritionData && JSON.stringify(existingPartialPackage.macros) !== JSON.stringify(finalNutritionData.macros))) {
                         updates.push(dataUpdateInventoryItem(db, userId, { ...existingPartialPackage, totalQuantity: newPartialQty, ...finalNutritionData }));
                    }
                } else {
                    updates.push(dataRemoveInventoryItem(db, userId, existingPartialPackage));
                }
            } else if (newPartialQty > 0) {
                 updates.push(dataAddInventoryItem(db, userId, { ...newItemBase, originalQuantity: size, totalQuantity: newPartialQty }));
            }
        }
        
        if (finalNutritionData && updates.length === 0) {
            for(const item of originalItems) {
                updates.push(dataUpdateInventoryItem(db, userId, { ...item, ...finalNutritionData }));
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
    const today = new Date();
    const threeDaysFromNow = new Date(today.setDate(today.getDate() + 3));
    const newExpiryDate = item.expiryDate ? new Date(Math.min(threeDaysFromNow.getTime(), new Date(item.expiryDate).getTime())) : threeDaysFromNow;
    const updatedItem: InventoryItem = { ...item, name: item.name.replace(/\(Freezer\)/i, "(Fridge)").trim(), expiryDate: newExpiryDate };
    return await dataUpdateInventoryItem(db, userId, updatedItem);
}

export async function handleUpdateMealTime(mealId: string, newTime: Date, mealType: DailyMacros['meal']): Promise<{success: boolean, error?: string | null, updatedMeal?: DailyMacros}> {
    const userId = await getCurrentUserId();
    try {
        const updatedMeal = await dataUpdateMealLog(db, userId, mealId, { loggedAt: newTime, meal: mealType });
        return { success: !!updatedMeal, error: updatedMeal ? null : "Meal not found.", updatedMeal };
    } catch(e) {
        return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred." };
    }
}

export async function handleUpdateMealLog(mealLog: DailyMacros): Promise<{success: boolean, error?: string | null, updatedMeal?: DailyMacros}> {
    const userId = await getCurrentUserId();
    try {
        const updatedMeal = await dataUpdateMealLog(db, userId, mealLog.id, mealLog);
        return { success: !!updatedMeal, error: updatedMeal ? null : "Meal not found.", updatedMeal };
    } catch(e) {
        return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred." };
    }
}

export async function handleDeleteMealLog(mealId: string): Promise<{success: boolean, error?: string | null, mealId: string}> {
     const userId = await getCurrentUserId();
    try {
        await dataDeleteMealLog(db, userId, mealId);
        return { success: true, error: null, mealId };
    } catch(e) {
        return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred.", mealId };
    }
}

export async function handleSaveRecipe(recipe: Recipe): Promise<{ success: boolean; error?: string }> {
    const userId = await getCurrentUserId();
    try {
        await dataSaveRecipe(db, userId, recipe);
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to save the recipe." };
    }
}

export async function handleRemoveSavedRecipe(recipeTitle: string): Promise<{ success: boolean; error?: string }> {
    const userId = await getCurrentUserId();
    try {
        await dataRemoveSavedRecipe(db, userId, recipeTitle);
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to remove the recipe." };
    }
}

export async function handleRemoveInventoryPackageGroup(itemsToRemove: InventoryItem[]): Promise<{ success: boolean; error: string | null; newInventory?: {privateItems: InventoryItem[], sharedItems: InventoryItem[]} }> {
    const userId = await getCurrentUserId();
    try {
        await dataRemoveInventoryItems(db, userId, itemsToRemove);
        const newInventory = await getInventory(db, userId);
        return { success: true, error: null, newInventory };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred." };
    }
}

export async function handleMoveInventoryItems(request: MoveRequest, destinationId: string): Promise<{ success: boolean; error: string | null; newInventory?: InventoryItem[] }> {
    const userId = await getCurrentUserId();
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
        return { success: true, error: null, newInventory: [...newInventory.privateItems, ...newInventory.sharedItems] };
    } catch (e) {
        return { success: false, error: "Failed to move items." };
    }
}

export async function handleReportSpoilage(request: SpoilageRequest): Promise<{ success: boolean; error: string | null; newInventory?: {privateItems: InventoryItem[], sharedItems: InventoryItem[]} }> {
    const userId = await getCurrentUserId();
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

export async function handleUpdateItemThreshold(itemId: string, threshold: number | null): Promise<{success: boolean, error?: string | null}> {
    const userId = await getCurrentUserId();
    try {
        await dataUpdateItemThreshold(db, userId, itemId, threshold);
        return { success: true, error: null };
    } catch (e) {
        const error = e instanceof Error ? e.message : "An unknown error occurred.";
        return { success: false, error: error };
    }
}

export async function handleLogMeal(recipe: Recipe, servingsEaten: number, mealType: string, selectedMemberIds: string[]) {
    const userId = await getCurrentUserId();
    const { privateItems, sharedItems } = await getClientInventory();
    const allItems = [...privateItems, ...sharedItems];

    const macrosPerServing = {
        calories: recipe.macros.calories / recipe.servings,
        protein: recipe.macros.protein / recipe.servings,
        carbs: recipe.macros.carbs / recipe.servings,
        fat: recipe.macros.fat / recipe.servings,
        fiber: (recipe.macros.fiber ?? 0) / recipe.servings,
        fats: {
            saturated: (recipe.macros.fats?.saturated ?? 0) / recipe.servings,
            monounsaturated: (recipe.macros.fats?.monounsaturated ?? 0) / recipe.servings,
            polyunsaturated: (recipe.macros.fats?.polyunsaturated ?? 0) / recipe.servings,
            trans: (recipe.macros.fats?.trans ?? 0) / recipe.servings,
        }
    };
    
    // Log macros for the current user
    if (servingsEaten > 0) {
        const macrosConsumed = {
            calories: macrosPerServing.calories * servingsEaten,
            protein: macrosPerServing.protein * servingsEaten,
            carbs: macrosPerServing.carbs * servingsEaten,
            fat: macrosPerServing.fat * servingsEaten,
            fiber: macrosPerServing.fiber * servingsEaten,
            fats: {
                saturated: macrosPerServing.fats.saturated * servingsEaten,
                monounsaturated: macrosPerServing.fats.monounsaturated * servingsEaten,
                polyunsaturated: macrosPerServing.fats.polyunsaturated * servingsEaten,
                trans: macrosPerServing.fats.trans * servingsEaten,
            }
        };
        await dataLogMacros(db, userId, mealType as any, recipe.title, macrosConsumed);
    }
    
    const itemsToRemove: { item: InventoryItem; amountToRemove: number }[] = [];

    // Deduct ingredients from inventory
    for (const ingredientString of recipe.ingredients) {
        const parsed = parseIngredient(ingredientString);
        const inventoryMatch = allItems.find(item => item.name.toLowerCase() === parsed.name.toLowerCase());

        if (inventoryMatch && parsed.quantity) {
             const amountNeededPerServing = parsed.quantity / recipe.servings;
             const totalAmountNeeded = amountNeededPerServing * servingsEaten;
             itemsToRemove.push({ item: inventoryMatch, amountToRemove: totalAmountNeeded });
        }
    }
    
    // Batch update inventory
    const promises = itemsToRemove.map(async ({item, amountToRemove}) => {
        const updatedQuantity = item.totalQuantity - amountToRemove;
        await dataUpdateInventoryItem(db, userId, {...item, totalQuantity: updatedQuantity});
    });

    await Promise.all(promises);

    // Create pending meal request if other members were selected
    if (selectedMemberIds.length > 0) {
        const household = await dataGetHousehold(db, userId);
        if (household) {
            await dataCreatePendingMeal(db, userId, household.id, recipe, selectedMemberIds);
        }
    }

    return { success: true, newInventory: await getClientInventory() };
}

export async function handleLogManualMeal(foods: string[], mealType: DailyMacros['meal'], loggedAt: Date) {
    const userId = await getCurrentUserId();
    
    const aiResult = await logManualMeal({ foods });

    if ('error' in aiResult) {
        return { success: false, error: aiResult.error };
    }

    const dishName = foods.join(', ');
    await dataLogMacros(db, userId, mealType, dishName, aiResult.macros, loggedAt);
    
    return { success: true };
}


export async function handleConfirmMeal(pendingMealId: string, servingsEaten: number, mealType: string, loggedAt: Date) {
    const userId = await getCurrentUserId();
    const household = await dataGetHousehold(db, userId);

    if (!household) {
        return { success: false, error: "You are not in a household." };
    }
    
    try {
        // First, log the macros for the user confirming the meal
        const pendingMeal = household.pendingMeals?.find(p => p.id === pendingMealId);
        if (!pendingMeal) {
            return { success: false, error: "Pending meal not found." };
        }
        
        const macrosPerServing = {
            calories: pendingMeal.recipe.macros.calories / pendingMeal.recipe.servings,
            protein: pendingMeal.recipe.macros.protein / pendingMeal.recipe.servings,
            carbs: pendingMeal.recipe.macros.carbs / pendingMeal.recipe.servings,
            fat: pendingMeal.recipe.macros.fat / pendingMeal.recipe.servings,
            fiber: (pendingMeal.recipe.macros.fiber ?? 0) / pendingMeal.recipe.servings,
            fats: {
                saturated: (pendingMeal.recipe.macros.fats?.saturated ?? 0) / pendingMeal.recipe.servings,
                monounsaturated: (pendingMeal.recipe.macros.fats?.monounsaturated ?? 0) / pendingMeal.recipe.servings,
                polyunsaturated: (pendingMeal.recipe.macros.fats?.polyunsaturated ?? 0) / pendingMeal.recipe.servings,
                trans: (pendingMeal.recipe.macros.fats?.trans ?? 0) / pendingMeal.recipe.servings,
            }
        };

        const macrosConsumed = {
            calories: macrosPerServing.calories * servingsEaten,
            protein: macrosPerServing.protein * servingsEaten,
            carbs: macrosPerServing.carbs * servingsEaten,
            fat: macrosPerServing.fat * servingsEaten,
            fiber: macrosPerServing.fiber * servingsEaten,
            fats: {
                saturated: macrosPerServing.fats.saturated * servingsEaten,
                monounsaturated: macrosPerServing.fats.monounsaturated * servingsEaten,
                polyunsaturated: macrosPerServing.fats.polyunsaturated * servingsEaten,
                trans: macrosPerServing.fats.trans * servingsEaten,
            }
        };

        await dataLogMacros(db, userId, mealType as any, pendingMeal.recipe.title, macrosConsumed, loggedAt);

        // Then, update the household document to remove the user from the pending list
        await dataProcessMealConfirmation(db, userId, household.id, pendingMealId);

        return { success: true };
    } catch(e) {
        return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred." };
    }
}

// Client Data Fetchers
export async function getClientInventory() {
    const userId = await getCurrentUserId();
    return getInventory(db, userId);
}

export async function getClientStorageLocations() {
    const userId = await getCurrentUserId();
    return dataGetStorageLocations(db, userId);
}

export async function getClientSavedRecipes() {
    const userId = await getCurrentUserId();
    return dataGetSavedRecipes(db, userId);
}

export async function getClientHouseholdRecipes() {
    const userId = await getCurrentUserId();
    return dataGetHouseholdRecipes(db, userId);
}

export async function getClientPersonalDetails() {
    const userId = await getCurrentUserId();
    return dataGetPersonalDetails(db, userId);
}

export async function savePersonalDetails(details: PersonalDetails) {
    const userId = await getCurrentUserId();
    return dataSavePersonalDetails(db, userId, details);
}

export async function getAllMacros() {
    const userId = await getCurrentUserId();
    return dataGetAllMacros(db, userId);
}

export async function addClientInventoryItem(item: NewInventoryItem) {
    const userId = await getCurrentUserId();
    return dataAddInventoryItem(db, userId, item);
}

export async function addClientStorageLocation(location: Omit<StorageLocation, 'id'>) {
    const userId = await getCurrentUserId();
    return dataAddStorageLocation(db, userId, location);
}

export async function updateClientStorageLocation(location: StorageLocation) {
    const userId = await getCurrentUserId();
    return dataUpdateStorageLocation(db, userId, location);
}

export async function removeClientStorageLocation(locationId: string) {
    const userId = await getCurrentUserId();
    return dataRemoveStorageLocation(db, userId, locationId);
}

export async function getSettings() {
    const userId = await getCurrentUserId();
    return dataGetSettings(db, userId);
}

export async function saveSettings(settings: Settings) {
    const userId = await getCurrentUserId();
    return dataSaveSettings(db, userId, settings);
}

// --- Shopping List Actions ---
export async function getClientShoppingList(): Promise<ShoppingListItem[]> {
    const userId = await getCurrentUserId();
    return dataGetShoppingList(db, userId);
}

export async function addClientShoppingListItem(item: Omit<ShoppingListItem, 'id' | 'addedAt'>): Promise<ShoppingListItem> {
    const userId = await getCurrentUserId();
    return dataAddShoppingListItem(db, userId, item);
}

export async function updateClientShoppingListItem(item: ShoppingListItem): Promise<ShoppingListItem> {
    const userId = await getCurrentUserId();
    return dataUpdateShoppingListItem(db, userId, item);
}

export async function removeClientShoppingListItem(itemId: string): Promise<{ id: string }> {
    const userId = await getCurrentUserId();
    return dataRemoveShoppingListItem(db, userId, itemId);
}

export async function removeClientCheckedShoppingListItems(): Promise<void> {
    const userId = await getCurrentUserId();
    return dataRemoveCheckedShoppingListItems(db, userId);
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
    const { FieldValue } = await import("firebase-admin/firestore");
    const userId = await getCurrentUserId();
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
    const { FieldValue } = await import("firebase-admin/firestore");
    const userId = await getCurrentUserId();
    try {
        await dataLeaveHousehold(db, FieldValue.arrayRemove, FieldValue.arrayUnion, userId, newOwnerId, itemsToTake, locationMapping);
        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function handleReviewLeaveRequest(requestId: string, approve: boolean) {
    const { FieldValue } = await import("firebase-admin/firestore");
    const userId = await getCurrentUserId();
    try {
        const updatedHousehold = await dataProcessLeaveRequest(db, FieldValue.arrayRemove, userId, requestId, approve);
        return { success: true, household: updatedHousehold };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}


export async function handleApproveMember(householdId: string, memberIdToApprove: string) {
    const { FieldValue } = await import("firebase-admin/firestore");
    const currentUserId = await getCurrentUserId();
    try {
        const updatedHousehold = await dataApprovePendingMember(db, FieldValue.arrayUnion, FieldValue.arrayRemove, currentUserId, householdId, memberIdToApprove);
        return { success: true, household: updatedHousehold };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function handleApproveAndMerge(householdId: string, memberIdToApprove: string, approvedItemIds: string[]) {
    const { FieldValue } = await import("firebase-admin/firestore");
    const currentUserId = await getCurrentUserId();
    try {
        const updatedHousehold = await dataApproveAndMergeMember(db, FieldValue.arrayUnion, FieldValue.arrayRemove, currentUserId, householdId, memberIdToApprove, approvedItemIds);
        return { success: true, household: updatedHousehold };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function handleRejectMember(householdId: string, memberIdToReject: string) {
    const { FieldValue } = await import("firebase-admin/firestore");
     const currentUserId = await getCurrentUserId();
    try {
        const updatedHousehold = await dataRejectPendingMember(db, FieldValue.arrayRemove, currentUserId, householdId, memberIdToReject);
        return { success: true, household: updatedHousehold };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function getClientPendingMemberInventory(memberId: string): Promise<InventoryItem[]> {
    const currentUserId = await getCurrentUserId();
    return getPendingMemberInventory(db, currentUserId, memberId);
}
