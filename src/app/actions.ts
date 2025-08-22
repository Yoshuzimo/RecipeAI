
'use server';

import type { Firestore, FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import type { InventoryItem, LeftoverDestination, Recipe, StorageLocation, Settings, PersonalDetails, MarkPrivateRequest, MoveRequest, SpoilageRequest, Household, RequestedItem, ShoppingListItem, NewInventoryItem, ItemMigrationMapping, Macros } from "@/lib/types";
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
    getSavedRecipes as dataGetSavedRecipes,
    getTodaysMacros as dataGetTodaysMacros,
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
} from "@/lib/data";
import { addDays } from "date-fns";
import { generateSuggestions, generateSubstitutions, generateRecipeDetails, logCookedMeal, generateShoppingList } from "@/ai/flows";
import type { SuggestionInput, SuggestionOutput } from "@/ai/flows/suggestion-flow";
import type { SubstitutionInput, SubstitutionOutput } from "@/ai/flows/substitution-flow";
import type { RecipeDetailsInput } from "@/ai/flows/recipe-details-flow";
import type { LogMealInput, LogMealOutput } from "@/ai/flows/log-meal-flow";
import type { ShoppingListInput, ShoppingListOutput } from "@/ai/flows/shopping-list-flow";
import { Substitution } from "@/lib/types";


// --- Server Actions ---

export async function getCurrentUserId(): Promise<string> {
    const { getAdmin } = require("@/lib/firebase-admin");
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
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    console.log(`ACTIONS: Starting seedUserData for user: ${userId}`);
    await dataSeedInitialData(db, userId);
}


// --- AI Actions ---

export async function handleGenerateSuggestions(cravingsOrMood: string): Promise<{suggestions: SuggestionOutput | null, error: any}> {
    try {
        const userId = await getCurrentUserId();
        const { getAdmin } = require("@/lib/firebase-admin");
        const { db } = getAdmin();
        
        const { privateItems, sharedItems } = await getInventory(db, userId);
        const inventory = [...privateItems, ...sharedItems];
        const personalDetails = await dataGetPersonalDetails(db, userId);
        const todaysMacros = await dataGetTodaysMacros(db, userId);
        const settings = await dataGetSettings(db, userId);

        const totalMacros = todaysMacros.reduce((acc, meal) => {
            acc.protein += meal.totals.protein;
            acc.carbs += meal.totals.carbs;
            acc.fat += meal.totals.fat;
            return acc;
        }, { protein: 0, carbs: 0, fat: 0 });

        const input: SuggestionInput = {
            inventory: inventory.map(i => ({...i, expiryDate: i.expiryDate || new Date()})), // Handle null expiry for schema
            personalDetails: personalDetails,
            todaysMacros: totalMacros,
            cravingsOrMood: cravingsOrMood,
            unitSystem: settings.unitSystem,
        };

        const suggestions = await generateSuggestions(input);

        return { suggestions, error: null };
    } catch (e: any) {
        console.error("Error generating suggestions:", e);
        return {
            suggestions: null,
            error: { form: [e.message || "An unexpected error occurred."] },
        }
    }
}

export async function handleGenerateShoppingList(inventory: {privateItems: InventoryItem[], sharedItems: InventoryItem[]}, personalDetails: PersonalDetails): Promise<{error: string | null, shoppingList: ShoppingListOutput | null}> {
    try {
        const userId = await getCurrentUserId();
        const { getAdmin } = require("@/lib/firebase-admin");
        const { db } = getAdmin();
        const settings = await dataGetSettings(db, userId);
        
        // This is a placeholder. In a real app, you'd generate a more meaningful history.
        const consumptionHistory = "User has been eating a variety of foods.";

        const input: ShoppingListInput = {
            inventory: [...inventory.privateItems, ...inventory.sharedItems].map(i => ({...i, expiryDate: i.expiryDate || new Date()})),
            personalDetails,
            consumptionHistory,
            unitSystem: settings.unitSystem
        };
        const shoppingList = await generateShoppingList(input);
        return { error: null, shoppingList };

    } catch (e: any) {
        console.error("Error generating shopping list:", e);
        return { error: e.message || "Failed to generate shopping list.", shoppingList: null };
    }
}

export async function handleGenerateSubstitutions(recipe: Recipe, ingredientsToReplace: string[], inventory: InventoryItem[], allowExternalSuggestions: boolean): Promise<{substitutions: SubstitutionOutput | null, error: string | null}> {
    try {
        const userId = await getCurrentUserId();
        const { getAdmin } = require("@/lib/firebase-admin");
        const { db } = getAdmin();
        const personalDetails = await dataGetPersonalDetails(db, userId);
        const settings = await dataGetSettings(db, userId);

        const input: SubstitutionInput = {
            recipe: {
                ...recipe,
                parsedIngredients: recipe.parsedIngredients || [],
            },
            ingredientsToReplace,
            inventory: inventory.map(i => ({...i, expiryDate: i.expiryDate || new Date()})),
            personalDetails,
            allowExternalSuggestions,
            unitSystem: settings.unitSystem,
        };
        const substitutions = await generateSubstitutions(input);
        return { substitutions, error: null };
    } catch(e: any) {
        console.error("Error generating substitutions:", e);
        return { substitutions: null, error: e.message || "Failed to get substitutions." };
    }
}

export async function handleGenerateRecipeDetails(recipeData: Omit<Recipe, "servings" | "macros" | "parsedIngredients" | "ingredients"> & { ingredients: string[] }): Promise<{recipe: Recipe | null, error: string | null}> {
     try {
        const input: RecipeDetailsInput = {
            title: recipeData.title,
            description: recipeData.description || "",
            ingredients: recipeData.ingredients,
            instructions: recipeData.instructions,
        };
        const recipe = await generateRecipeDetails(input);
        return { recipe: { ...recipe, parsedIngredients: recipe.parsedIngredients || [] }, error: null };
     } catch (e: any) {
        console.error("Error generating recipe details:", e);
        return { recipe: null, error: e.message || "Failed to finalize recipe." };
     }
}


// Inventory & Meal Logging
export async function handleLogCookedMeal(recipe: Recipe, servingsEaten: number, servingsEatenByOthers: number, fridgeLeftovers: LeftoverDestination[], freezerLeftovers: LeftoverDestination[], mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack"): Promise<{ success: boolean; error: string | null, newInventory?: InventoryItem[] }> {
    try {
        const userId = await getCurrentUserId();
        const { getAdmin } = require("@/lib/firebase-admin");
        const { db } = getAdmin();
        const { privateItems, sharedItems } = await getInventory(db, userId);
        const inventory = [...privateItems, ...sharedItems];
        const settings = await getSettings(db, userId);

        const input: LogMealInput = {
            recipe: {
                ...recipe,
                parsedIngredients: recipe.parsedIngredients || [],
            },
            inventory: inventory.map(i => ({...i, expiryDate: i.expiryDate || new Date()})),
            servingsEaten,
            servingsEatenByOthers,
            fridgeLeftovers,
            freezerLeftovers,
            unitSystem: settings.unitSystem
        };

        const result: LogMealOutput = await logCookedMeal(input);

        // Process the results to update Firestore
        const batch = db.batch();
        const userDoc = await db.collection('users').doc(userId).get();
        const householdId = userDoc.data()?.householdId;

        // 1. Remove items
        result.itemsToRemove.forEach(item => {
            const itemToDelete = inventory.find(i => i.id === item.id);
            if (itemToDelete) {
                const collectionPath = (itemToDelete.isPrivate || !householdId) ? `users/${userId}/inventory` : `households/${householdId}/inventory`;
                batch.delete(db.collection(collectionPath).doc(item.id));
            }
        });

        // 2. Update items
        result.itemsToUpdate.forEach(item => {
            const itemToUpdate = inventory.find(i => i.id === item.id);
            if (itemToUpdate) {
                const collectionPath = (itemToUpdate.isPrivate || !householdId) ? `users/${userId}/inventory` : `households/${householdId}/inventory`;
                batch.update(db.collection(collectionPath).doc(item.id), { totalQuantity: item.newQuantity });
            }
        });
        
        // 3. Add leftover items
        result.leftoverItems.forEach(item => {
            const collectionPath = (item.isPrivate || !householdId) ? `users/${userId}/inventory` : `households/${householdId}/inventory`;
            const newLeftoverRef = db.collection(collectionPath).doc();
            batch.set(newLeftoverRef, item);
        });

        await batch.commit();
        
        // 4. Log macros
        await logMacros(db, userId, mealType, recipe.title, result.macrosConsumed);

        const updatedInventory = await getInventory(db, userId);
        return { success: true, error: null, newInventory: [...updatedInventory.privateItems, ...updatedInventory.sharedItems] };

    } catch (e: any) {
        console.error("Error logging meal:", e);
        return { success: false, error: e.message || "An unexpected error occurred.", newInventory: [] };
    }
}

export async function handleUpdateInventoryGroup(originalItems: InventoryItem[], formData: { [key: string]: { full: number; partial: number } }, itemName: string, unit: 'g' | 'kg' | 'ml' | 'l' | 'pcs' | 'oz' | 'lbs' | 'fl oz' | 'gallon'): Promise<{ success: boolean; error: string | null; newInventory?: {privateItems: InventoryItem[], sharedItems: InventoryItem[]} }> {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
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
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    const today = new Date();
    const threeDaysFromNow = new Date(today.setDate(today.getDate() + 3));
    const newExpiryDate = item.expiryDate ? new Date(Math.min(threeDaysFromNow.getTime(), new Date(item.expiryDate).getTime())) : threeDaysFromNow;
    const updatedItem: InventoryItem = { ...item, name: item.name.replace(/\(Freezer\)/i, "(Fridge)").trim(), expiryDate: newExpiryDate };
    return await dataUpdateInventoryItem(db, userId, updatedItem);
}

export async function handleUpdateMealTime(mealId: string, newTime: string): Promise<{success: boolean, error?: string | null}> {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
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
    const { getAdmin } = require("@/lib/firebase-admin");
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
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
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
    const { getAdmin } = require("@/lib/firebase-admin");
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
        return { success: true, error: null, newInventory: [...newInventory.privateItems, ...newInventory.sharedItems] };
    } catch (e) {
        return { success: false, error: "Failed to move items." };
    }
}

export async function handleReportSpoilage(request: SpoilageRequest): Promise<{ success: boolean; error: string | null; newInventory?: {privateItems: InventoryItem[], sharedItems: InventoryItem[]} }> {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
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
    const { getAdmin } = require("@/lib/firebase-admin");
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
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return getInventory(db, userId);
}

export async function getClientStorageLocations() {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataGetStorageLocations(db, userId);
}

export async function getClientSavedRecipes() {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataGetSavedRecipes(db, userId);
}

export async function getClientPersonalDetails() {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataGetPersonalDetails(db, userId);
}

export async function savePersonalDetails(details: PersonalDetails) {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataSavePersonalDetails(db, userId, details);
}

export async function getClientTodaysMacros() {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataGetTodaysMacros(db, userId);
}

export async function addClientInventoryItem(item: NewInventoryItem) {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataAddInventoryItem(db, userId, item);
}

export async function addClientStorageLocation(location: Omit<StorageLocation, 'id'>) {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataAddStorageLocation(db, userId, location);
}

export async function updateClientStorageLocation(location: StorageLocation) {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataUpdateStorageLocation(db, userId, location);
}

export async function removeClientStorageLocation(locationId: string) {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataRemoveStorageLocation(db, userId, locationId);
}

export async function getSettings() {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataGetSettings(db, userId);
}

export async function saveSettings(settings: Settings) {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataSaveSettings(db, userId, settings);
}

// --- Shopping List Actions ---
export async function getClientShoppingList(): Promise<ShoppingListItem[]> {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataGetShoppingList(db, userId);
}

export async function addClientShoppingListItem(item: Omit<ShoppingListItem, 'id' | 'addedAt'>): Promise<ShoppingListItem> {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataAddShoppingListItem(db, userId, item);
}

export async function updateClientShoppingListItem(item: ShoppingListItem): Promise<ShoppingListItem> {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataUpdateShoppingListItem(db, userId, item);
}

export async function removeClientShoppingListItem(itemId: string): Promise<{ id: string }> {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return dataRemoveShoppingListItem(db, userId, itemId);
}

export async function removeClientCheckedShoppingListItems(): Promise<void> {
    const userId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
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
    const { getAdmin } = require("@/lib/firebase-admin");
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
    const { getAdmin } = require("@/lib/firebase-admin");
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
    const { getAdmin } = require("@/lib/firebase-admin");
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
    const { getAdmin } = require("@/lib/firebase-admin");
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
    const { getAdmin } = require("@/lib/firebase-admin");
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
    const { getAdmin } = require("@/lib/firebase-admin");
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
    const { getAdmin } = require("@/lib/firebase-admin");
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
    const { getAdmin } = require("@/lib/firebase-admin");
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
     const { getAdmin } = require("@/lib/firebase-admin");
     const { db, FieldValue } = getAdmin();
    try {
        const updatedHousehold = await dataRejectPendingMember(db, FieldValue.arrayRemove, currentUserId, householdId, memberIdToReject);
        return { success: true, household: updatedHousehold };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}

export async function getClientPendingMemberInventory(memberId: string): Promise<InventoryItem[]> {
    const currentUserId = await getCurrentUserId();
    const { getAdmin } = require("@/lib/firebase-admin");
    const { db } = getAdmin();
    return getPendingMemberInventory(db, currentUserId, memberId);
}
