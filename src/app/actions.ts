

'use server';

import type { Firestore, FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import type { InventoryItem, LeftoverDestination, Recipe, StorageLocation, Settings, PersonalDetails, MarkPrivateRequest, MoveRequest, SpoilageRequest, Household, RequestedItem, ShoppingListItem, NewInventoryItem, ItemMigrationMapping, Macros, PendingMeal, Unit, DailyMacros, LoggedDish, DetailedFats } from "@/lib/types";
import { db, auth } from "@/lib/firebase-admin";
import {
    seedInitialData as dataSeedInitialData,
    getPersonalDetails as dataGetPersonalDetails,
    updateInventoryItem as dataUpdateInventoryItem,
    addInventoryItem as dataAddInventoryItem,
    removeInventoryItem as dataRemoveInventoryItem,
    getInventory,
    logDishes as dataLogDishes,
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
    moveDishToNewMeal as dataMoveDishToNewMeal,
} from "@/lib/data";
import { addDays } from "date-fns";
import { parseIngredient } from "@/lib/utils";
import { logManualMeal, LogManualMealInput } from "@/ai/flows/log-manual-meal";


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

            const normalizedMacros: Partial<Macros> = {};
            if (servingMacros.calories !== undefined && servingMacros.calories !== null) normalizedMacros.calories = servingMacros.calories * scaleFactor;
            if (servingMacros.protein !== undefined && servingMacros.protein !== null) normalizedMacros.protein = servingMacros.protein * scaleFactor;
            if (servingMacros.carbs !== undefined && servingMacros.carbs !== null) normalizedMacros.carbs = servingMacros.carbs * scaleFactor;
            if (servingMacros.fat !== undefined && servingMacros.fat !== null) normalizedMacros.fat = servingMacros.fat * scaleFactor;
            if (servingMacros.fiber !== undefined && servingMacros.fiber !== null) normalizedMacros.fiber = servingMacros.fiber * scaleFactor;
            if (servingMacros.sugar !== undefined && servingMacros.sugar !== null) normalizedMacros.sugar = servingMacros.sugar * scaleFactor;
            if (servingMacros.sodium !== undefined && servingMacros.sodium !== null) normalizedMacros.sodium = servingMacros.sodium * scaleFactor;
            if (servingMacros.cholesterol !== undefined && servingMacros.cholesterol !== null) normalizedMacros.cholesterol = servingMacros.cholesterol * scaleFactor;
            
            const newFats: Partial<DetailedFats> = {};
            if (servingMacros.fats?.saturated !== undefined && servingMacros.fats?.saturated !== null) newFats.saturated = servingMacros.fats.saturated * scaleFactor;
            if (servingMacros.fats?.monounsaturated !== undefined && servingMacros.fats?.monounsaturated !== null) newFats.monounsaturated = servingMacros.fats.monounsaturated * scaleFactor;
            if (servingMacros.fats?.polyunsaturated !== undefined && servingMacros.fats?.polyunsaturated !== null) newFats.polyunsaturated = servingMacros.fats.polyunsaturated * scaleFactor;
            if (servingMacros.fats?.trans !== undefined && servingMacros.fats?.trans !== null) newFats.trans = servingMacros.fats.trans * scaleFactor;

            if (Object.keys(newFats).length > 0) {
                normalizedMacros.fats = newFats;
            }
            
            finalNutritionData = {
                macros: normalizedMacros as Macros,
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


export async function handleUpdateMealLog(mealId: string, updates: Partial<DailyMacros>): Promise<{ success: boolean; error?: string | null; updatedMeal?: DailyMacros, deletedMealId?: string }> {
    const userId = await getCurrentUserId();
    try {
        const dataToUpdate: Partial<DailyMacros> = { ...updates };

        // If all dishes are removed, delete the meal log entry entirely.
        if (updates.dishes && updates.dishes.length === 0) {
            await dataDeleteMealLog(db, userId, mealId);
            return { success: true, deletedMealId: mealId };
        }

        // If dishes are being updated, we must recalculate totals.
        if (updates.dishes) {
            dataToUpdate.totals = updates.dishes.reduce((acc, dish) => {
                acc.calories += dish.calories || 0;
                acc.protein += dish.protein || 0;
                acc.carbs += dish.carbs || 0;
                acc.fat += dish.fat || 0;
                acc.fiber = (acc.fiber || 0) + (dish.fiber || 0);
                acc.sugar = (acc.sugar || 0) + (dish.sugar || 0);
                acc.sodium = (acc.sodium || 0) + (dish.sodium || 0);
                acc.cholesterol = (acc.cholesterol || 0) + (dish.cholesterol || 0);
                acc.fats = {
                    saturated: (acc.fats?.saturated || 0) + (dish.fats?.saturated || 0),
                    monounsaturated: (acc.fats?.monounsaturated || 0) + (dish.fats?.monounsaturated || 0),
                    polyunsaturated: (acc.fats?.polyunsaturated || 0) + (dish.fats?.polyunsaturated || 0),
                    trans: (acc.fats?.trans || 0) + (dish.fats?.trans || 0),
                };
                return acc;
            }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, cholesterol: 0, fats: { saturated: 0, monounsaturated: 0, polyunsaturated: 0, trans: 0 } });
        }
        
        const updatedMeal = await dataUpdateMealLog(db, userId, mealId, dataToUpdate);
        return { success: !!updatedMeal, error: updatedMeal ? null : "Meal not found.", updatedMeal };
    } catch(e) {
        return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred." };
    }
}

export async function handleMoveDishToNewMeal(
    originalMeal: DailyMacros,
    dishToMove: LoggedDish,
    newMealType: DailyMacros['meal'],
    newLoggedAt: Date
): Promise<{ success: boolean; error?: string | null; updatedOriginalMeal?: DailyMacros, newMeal?: DailyMacros }> {
     const userId = await getCurrentUserId();
     try {
        const { newMeal, updatedOriginalMeal } = await dataMoveDishToNewMeal(db, userId, originalMeal, dishToMove, newMealType, newLoggedAt);
        return { success: true, error: null, newMeal, updatedOriginalMeal };
     } catch (e) {
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

export async function handleLogMeal(
    recipe: Recipe,
    servingsEaten: number,
    mealType: string,
    selectedMemberIds: string[],
    fridgeLeftovers: LeftoverDestination[],
    freezerLeftovers: LeftoverDestination[]
) {
    const userId = await getCurrentUserId();
    const { privateItems, sharedItems } = await getClientInventory();
    const allItems = [...privateItems, ...sharedItems];
    const household = await dataGetHousehold(db, userId);
    
    // Log macros for the current user
    if (servingsEaten > 0) {
        const macrosPerServing = {
            calories: recipe.macros.calories / recipe.servings,
            protein: recipe.macros.protein / recipe.servings,
            carbs: recipe.macros.carbs / recipe.servings,
            fat: recipe.macros.fat / recipe.servings,
            fiber: (recipe.macros.fiber ?? 0) / recipe.servings,
            sugar: (recipe.macros.sugar ?? 0) / recipe.servings,
            sodium: (recipe.macros.sodium ?? 0) / recipe.servings,
            cholesterol: (recipe.macros.cholesterol ?? 0) / recipe.servings,
            fats: {
                saturated: (recipe.macros.fats?.saturated ?? 0) / recipe.servings,
                monounsaturated: (recipe.macros.fats?.monounsaturated ?? 0) / recipe.servings,
                polyunsaturated: (recipe.macros.fats?.polyunsaturated ?? 0) / recipe.servings,
                trans: (recipe.macros.fats?.trans ?? 0) / recipe.servings,
            }
        };

        const macrosConsumed = {
            calories: macrosPerServing.calories * servingsEaten,
            protein: macrosPerServing.protein * servingsEaten,
            carbs: macrosPerServing.carbs * servingsEaten,
            fat: macrosPerServing.fat * servingsEaten,
            fiber: macrosPerServing.fiber * servingsEaten,
            sugar: macrosPerServing.sugar * servingsEaten,
            sodium: macrosPerServing.sodium * servingsEaten,
            cholesterol: macrosPerServing.cholesterol * servingsEaten,
            fats: {
                saturated: macrosPerServing.fats.saturated * servingsEaten,
                monounsaturated: macrosPerServing.fats.monounsaturated * servingsEaten,
                polyunsaturated: macrosPerServing.fats.polyunsaturated * servingsEaten,
                trans: macrosPerServing.fats.trans * servingsEaten,
            }
        };
        await dataLogDishes(db, userId, mealType as any, [{name: recipe.title, ...macrosConsumed}]);
    }
    
    const itemsToRemove: { item: InventoryItem; amountToRemove: number }[] = [];
    const totalServingsConsumed = servingsEaten + selectedMemberIds.length;

    // Deduct ingredients from inventory
    for (const ingredientString of recipe.ingredients) {
        const parsed = parseIngredient(ingredientString);
        const inventoryMatch = allItems.find(item => item.name.toLowerCase() === parsed.name.toLowerCase());

        if (inventoryMatch && parsed.quantity) {
             const amountNeededPerServing = parsed.quantity / recipe.servings;
             const totalAmountNeeded = amountNeededPerServing * totalServingsConsumed;
             itemsToRemove.push({ item: inventoryMatch, amountToRemove: totalAmountNeeded });
        }
    }
    
    // Batch update inventory
    const inventoryUpdatePromises = itemsToRemove.map(async ({item, amountToRemove}) => {
        const updatedQuantity = item.totalQuantity - amountToRemove;
        await dataUpdateInventoryItem(db, userId, {...item, totalQuantity: updatedQuantity});
    });
    
    // Create Leftover Items
    const leftoverPromises = [...fridgeLeftovers, ...freezerLeftovers].map(dest => {
        if (dest.servings > 0 && dest.locationId) {
             const isFreezer = freezerLeftovers.some(f => f.locationId === dest.locationId);
             const leftoverMacros = {
                 calories: (recipe.macros.calories / recipe.servings) || 0,
                 protein: (recipe.macros.protein / recipe.servings) || 0,
                 carbs: (recipe.macros.carbs / recipe.servings) || 0,
                 fat: (recipe.macros.fat / recipe.servings) || 0,
                 fiber: (recipe.macros.fiber / recipe.servings) || 0,
                 sugar: (recipe.macros.sugar / recipe.servings) || 0,
                 sodium: (recipe.macros.sodium / recipe.servings) || 0,
                 cholesterol: (recipe.macros.cholesterol / recipe.servings) || 0,
                 fats: {
                     saturated: (recipe.macros.fats?.saturated / recipe.servings) || 0,
                     monounsaturated: (recipe.macros.fats?.monounsaturated / recipe.servings) || 0,
                     polyunsaturated: (recipe.macros.fats?.polyunsaturated / recipe.servings) || 0,
                     trans: (recipe.macros.fats?.trans / recipe.servings) || 0,
                 }
             };

             const newLeftover: NewInventoryItem = {
                name: `Leftover - ${recipe.title}`,
                originalQuantity: dest.servings,
                totalQuantity: dest.servings,
                unit: 'pcs',
                expiryDate: isFreezer ? addDays(new Date(), 90) : addDays(new Date(), 3),
                locationId: dest.locationId,
                isPrivate: !household,
                macros: leftoverMacros, // Store per-serving macros for the leftover
            };
            return addClientInventoryItem(newLeftover);
        }
        return Promise.resolve();
    });
    
    await Promise.all([...inventoryUpdatePromises, ...leftoverPromises]);

    // Create pending meal request if other members were selected
    if (selectedMemberIds.length > 0 && household) {
        await dataCreatePendingMeal(db, userId, household.id, recipe, selectedMemberIds);
    }

    return { success: true, newInventory: await getClientInventory() };
}

export async function handleLogManualMeal(
    foods: (LogManualMealInput['foods'][0] & { deduct: boolean })[],
    mealType: DailyMacros['meal'],
    loggedAt: Date
): Promise<{ success: boolean; error?: string | null, allMacros?: DailyMacros[] }> {
    const userId = await getCurrentUserId();
    const allDishes: LoggedDish[] = [];

    for (const food of foods) {
        const aiResult = await logManualMeal({ foods: [food] });
        if ('error' in aiResult) {
            return { success: false, error: `Could not analyze "${food.name}": ${aiResult.error}` };
        }
        allDishes.push({
            name: `${food.quantity} ${food.unit} ${food.name}`,
            ...aiResult.macros,
        });
    }

    if (allDishes.length > 0) {
        await dataLogDishes(db, userId, mealType, allDishes, loggedAt);
    }
    
    // Deduct items from inventory if specified
    const itemsToDeduct = foods.filter(f => f.deduct);
    if (itemsToDeduct.length > 0) {
        const { privateItems, sharedItems } = await getInventory(db, userId);
        const allInventory = [...privateItems, ...sharedItems].sort((a,b) => (a.expiryDate?.getTime() ?? Infinity) - (b.expiryDate?.getTime() ?? Infinity));

        const updates: Promise<any>[] = [];
        
        for (const food of itemsToDeduct) {
            const parsed = parseIngredient(`${food.quantity} ${food.unit} ${food.name}`);
            const inventoryMatch = allInventory.find(item => item.name.toLowerCase() === parsed.name.toLowerCase());
            
            if (inventoryMatch && parsed.quantity) {
                const updatedQuantity = inventoryMatch.totalQuantity - parsed.quantity;
                updates.push(dataUpdateInventoryItem(db, userId, {...inventoryMatch, totalQuantity: updatedQuantity}));
            }
        }
        await Promise.all(updates);
    }
    
    const newMacros = await getAllMacros();
    return { success: true, allMacros: newMacros };
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
            sugar: (pendingMeal.recipe.macros.sugar ?? 0) / pendingMeal.recipe.servings,
            sodium: (pendingMeal.recipe.macros.sodium ?? 0) / pendingMeal.recipe.servings,
            cholesterol: (pendingMeal.recipe.macros.cholesterol ?? 0) / pendingMeal.recipe.servings,
            fats: {
                saturated: (pendingMeal.recipe.macros.fats?.saturated ?? 0) / pendingMeal.recipe.servings,
                monounsaturated: (pendingMeal.recipe.macros.fats?.monounsaturated ?? 0) / recipe.servings,
                polyunsaturated: (pendingMeal.recipe.macros.fats?.polyunsaturated ?? 0) / recipe.servings,
                trans: (pendingMeal.recipe.macros.fats?.trans ?? 0) / recipe.servings,
            }
        };

        const macrosConsumed = {
            calories: macrosPerServing.calories * servingsEaten,
            protein: macrosPerServing.protein * servingsEaten,
            carbs: macrosPerServing.carbs * servingsEaten,
            fat: macrosPerServing.fat * servingsEaten,
            fiber: macrosPerServing.fiber * servingsEaten,
            sugar: macrosPerServing.sugar * servingsEaten,
            sodium: macrosPerServing.sodium * servingsEaten,
            cholesterol: macrosPerServing.cholesterol * servingsEaten,
            fats: {
                saturated: macrosPerServing.fats.saturated * servingsEaten,
                monounsaturated: macrosPerServing.fats.monounsaturated * servingsEaten,
                polyunsaturated: macrosPerServing.fats.polyunsaturated * servingsEaten,
                trans: macrosPerServing.fats.trans * servingsEaten,
            }
        };

        await dataLogDishes(db, userId, mealType as any, [{name: pendingMeal.recipe.title, ...macrosConsumed}], loggedAt);

        // Then, update the household document to remove the user from the pending list
        await dataProcessMealConfirmation(db, userId, household.id, pendingMealId);

        return { success: true };
    } catch(e) {
        return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred." };
    }
}

export async function handleEatSingleItem(
    item: InventoryItem,
    quantityEaten: number,
    mealType: DailyMacros['meal'],
    loggedAt: Date
): Promise<{ success: boolean; error?: string | null; newInventory?: { privateItems: InventoryItem[]; sharedItems: InventoryItem[] } }> {
    const userId = await getCurrentUserId();
    
    const isLeftoverWithMacros = 
        item.name.toLowerCase().startsWith('leftover') &&
        item.macros &&
        item.unit === 'pcs';

    if (isLeftoverWithMacros) {
        const macrosPerServing = item.macros!;
        const consumedMacros: Macros = {
            calories: (macrosPerServing.calories || 0) * quantityEaten,
            protein: (macrosPerServing.protein || 0) * quantityEaten,
            carbs: (macrosPerServing.carbs || 0) * quantityEaten,
            fat: (macrosPerServing.fat || 0) * quantityEaten,
            fiber: (macrosPerServing.fiber || 0) * quantityEaten,
            sugar: (macrosPerServing.sugar || 0) * quantityEaten,
            sodium: (macrosPerServing.sodium || 0) * quantityEaten,
            cholesterol: (macrosPerServing.cholesterol || 0) * quantityEaten,
            fats: {
                saturated: (macrosPerServing.fats?.saturated || 0) * quantityEaten,
                monounsaturated: (macrosPerServing.fats?.monounsaturated || 0) * quantityEaten,
                polyunsaturated: (macrosPerServing.fats?.polyunsaturated || 0) * quantityEaten,
                trans: (macrosPerServing.fats?.trans || 0) * quantityEaten,
            }
        };
        await dataLogDishes(db, userId, mealType, [{name: item.name, ...consumedMacros}], loggedAt);
    
    } else if (item.macros && item.servingSize && item.servingMacros) {
        const { servingSize, servingMacros } = item;
        const normalizedServingSize = normalizeToGramsOrML(servingSize.quantity, servingSize.unit);
        const quantityEatenNormalized = normalizeToGramsOrML(quantityEaten, item.unit);
        const scaleFactor = quantityEatenNormalized / normalizedServingSize;
        
        const consumedMacros: Macros = {
            calories: (servingMacros.calories || 0) * scaleFactor,
            protein: (servingMacros.protein || 0) * scaleFactor,
            carbs: (servingMacros.carbs || 0) * scaleFactor,
            fat: (servingMacros.fat || 0) * scaleFactor,
            fiber: (servingMacros.fiber || 0) * scaleFactor,
            sugar: (servingMacros.sugar || 0) * scaleFactor,
            sodium: (servingMacros.sodium || 0) * scaleFactor,
            cholesterol: (servingMacros.cholesterol || 0) * scaleFactor,
            fats: {
                saturated: (servingMacros.fats?.saturated || 0) * scaleFactor,
                monounsaturated: (servingMacros.fats?.monounsaturated || 0) * scaleFactor,
                polyunsaturated: (servingMacros.fats?.polyunsaturated || 0) * scaleFactor,
                trans: (servingMacros.fats?.trans || 0) * scaleFactor,
            }
        };
        await dataLogDishes(db, userId, mealType, [{name: item.name, ...consumedMacros}], loggedAt);

    } else {
        const aiInput: LogManualMealInput = {
            foods: [{
                quantity: String(quantityEaten),
                unit: item.unit,
                name: item.name,
            }]
        };
        const aiResult = await logManualMeal(aiInput);
        if ('error' in aiResult) {
            return { success: false, error: aiResult.error };
        }
        await dataLogDishes(db, userId, mealType, [{name: item.name, ...aiResult.macros}], loggedAt);
    }
    
    // 2. Deduct from inventory
    const updatedQuantity = item.totalQuantity - quantityEaten;
    await dataUpdateInventoryItem(db, userId, { ...item, totalQuantity: updatedQuantity });
    
    // 3. Return updated inventory
    const newInventory = await getInventory(db, userId);
    return { success: true, error: null, newInventory };
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

export async function getClientTodaysMacros() {
    const userId = await getCurrentUserId();
    const allMacros = await dataGetAllMacros(db, userId);
    const settings = await dataGetSettings(db, userId);
    const dayStartTime = settings?.dayStartTime || "00:00";
    const { isWithinUserDay } = await import("@/lib/utils");
    return allMacros.filter(d => isWithinUserDay(d.loggedAt, dayStartTime));
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
