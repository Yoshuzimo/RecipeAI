
"use server";

import { getPersonalDetails, getUnitSystem, updateInventoryItem, addInventoryItem, removeInventoryItem, getInventory, logMacros, updateMealTime, saveRecipe, removeInventoryItems, seedInitialData, getStorageLocations, getSavedRecipes, getTodaysMacros, addStorageLocation, updateStorageLocation, removeStorageLocation, getSettings as dataGetSettings, saveSettings as dataSaveSettings, savePersonalDetails as dataSavePersonalDetails } from "@/lib/data";
import type { InventoryItem, LeftoverDestination, Recipe, Substitution, RecipeIngredient, InventoryPackageGroup, Unit, MoveRequest, SpoilageRequest, StorageLocation, Settings, PersonalDetails, Macros, MarkPrivateRequest } from "@/lib/types";
import { addDays, parseISO, differenceInDays } from "date-fns";
import { z } from "zod";
import { getAuth } from 'firebase-admin/auth';
import { cookies } from "next/headers";
import { initFirebaseAdmin } from "@/lib/firebase-admin";


initFirebaseAdmin();


export async function getCurrentUserId(): Promise<string> {
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) {
        throw new Error("Authentication required. Please log in.");
    }
    try {
        const decodedToken = await getAuth().verifySessionCookie(sessionCookie, true);
        return decodedToken.uid;
    } catch (error) {
        console.error("Error verifying session cookie in getCurrentUserId:", error);
        throw new Error("Your session has expired. Please log in again.");
    }
}


export async function seedUserData(userId: string): Promise<void> {
    console.log(`ACTIONS: Starting seedUserData for user: ${userId}`);
    await seedInitialData(userId);
}


function formatInventoryToString(inventory: InventoryItem[]): string {
    if (!inventory || inventory.length === 0) return "None";

    const aggregatedInventory = inventory.reduce((acc, item) => {
        const itemExpiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
        const key = `${item.name} (${item.unit})`;
        if (acc[key]) {
            acc[key].totalQuantity += item.totalQuantity;
            if (itemExpiryDate && (!acc[key].earliestExpiry || itemExpiryDate < acc[key].earliestExpiry)) {
                acc[key].earliestExpiry = itemExpiryDate;
            }
        } else {
            acc[key] = {
                totalQuantity: item.totalQuantity,
                unit: item.unit,
                earliestExpiry: itemExpiryDate,
                name: item.name,
            };
        }
        return acc;
    }, {} as Record<string, {name: string, totalQuantity: number; unit: string; earliestExpiry: Date | null }>);

    return Object.values(aggregatedInventory)
        .map(data => 
            `${data.name} (${data.totalQuantity.toFixed(1)}${data.unit}, expires ~${data.earliestExpiry ? new Date(data.earliestExpiry).toLocaleDateString() : 'N/A'})`
        )
        .join(', ');
}


export async function handleGenerateSuggestions(formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    const personalDetails = await getPersonalDetails(userId);
    const todaysMacros = await getTodaysMacros(userId);
    const aggregatedMacros = todaysMacros.reduce((acc, meal) => {
        acc.protein += meal.totals.protein;
        acc.carbs += meal.totals.carbs;
        acc.fat += meal.totals.fat;
        return acc;
    }, { protein: 0, carbs: 0, fat: 0 });

    const rawInventory = formData.get('inventory');
    const inventory: InventoryItem[] = JSON.parse(rawInventory as string);
    const now = new Date();
    
    return {
      error: { form: ["AI features are currently under maintenance. Please try again later."] },
      suggestions: null,
      debugInfo: { promptInput: "", rawResponse: "" }
    };
  } catch (error) {
    console.error("Error generating suggestions:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return {
      error: { form: [errorMessage] },
      suggestions: null,
      debugInfo: { promptInput: "", rawResponse: errorMessage }
    };
  }
}

export async function handleGenerateShoppingList(
  inventory: InventoryItem[],
  personalDetails: PersonalDetails
) {
    try {
        return { error: "AI features are currently under maintenance. Please try again later.", shoppingList: null };
    } catch (error) {
        console.error("Error generating shopping list:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { error: errorMessage, shoppingList: null };
    }
}

export async function handleGenerateSubstitutions(
  recipe: Recipe,
  ingredientsToReplace: string[],
  inventory: InventoryItem[],
  allowExternalSuggestions: boolean,
): Promise<{ substitutions: Substitution[] | null, error: string | null}> {
    try {
        return { substitutions: null, error: "AI features are currently under maintenance. Please try again later." };
    } catch (error) {
        console.error("Error generating substitutions:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { substitutions: null, error: errorMessage };
    }
}


export async function handleLogCookedMeal(
    recipe: Recipe,
    servingsEaten: number,
    servingsEatenByOthers: number,
    fridgeLeftovers: LeftoverDestination[],
    freezerLeftovers: LeftoverDestination[],
    mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack"
): Promise<{ success: boolean; error: string | null; newInventory?: InventoryItem[] }> {
    const userId = await getCurrentUserId();
    try {
        const errorMsg = "AI features are currently under maintenance. Please try again later.";
        return { success: false, error: errorMsg };

    } catch (error) {
        console.error("Error logging cooked meal:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to log meal and update inventory.";
        return { success: false, error: errorMessage };
    }
}

export async function handleUpdateInventoryGroup(
    originalItems: InventoryItem[],
    formData: { [key: string]: { full: number; partial: number } },
    itemName: string,
    unit: Unit
): Promise<{ success: boolean; error: string | null; newInventory?: InventoryItem[] }> {
    const userId = await getCurrentUserId();
    try {
        const originalPackagesByUID = new Map(originalItems.map(item => [`${item.originalQuantity}-${item.id}`, item]));

        const updates: Promise<any>[] = [];

        // Process form data
        for (const sizeStr in formData) {
            const size = Number(sizeStr);
            const { full: newFullCount, partial: newPartialQty } = formData[sizeStr];

            const existingFullPackages = originalItems.filter(i => i.originalQuantity === size && i.totalQuantity === size);
            const existingPartialPackage = originalItems.find(i => i.originalQuantity === size && i.totalQuantity < size);

            const currentFullCount = existingFullPackages.length;

            // Adjust full packages
            if (newFullCount > currentFullCount) {
                // Add new full packages
                const toAdd = newFullCount - currentFullCount;
                for (let i = 0; i < toAdd; i++) {
                    updates.push(addInventoryItem(userId, {
                        name: itemName,
                        originalQuantity: size,
                        totalQuantity: size,
                        unit: unit,
                        expiryDate: addDays(new Date(), 7), // Default expiry
                        locationId: originalItems[0]?.locationId || 'pantry-1', // Default location
                    }));
                }
            } else if (newFullCount < currentFullCount) {
                // Remove full packages
                const toRemove = currentFullCount - newFullCount;
                for (let i = 0; i < toRemove; i++) {
                    updates.push(removeInventoryItem(userId, existingFullPackages[i].id));
                }
            }

            // Adjust partial package
            if (existingPartialPackage) {
                // Update existing partial
                if (newPartialQty > 0) {
                    if (existingPartialPackage.totalQuantity !== newPartialQty) {
                        updates.push(updateInventoryItem(userId, { ...existingPartialPackage, totalQuantity: newPartialQty }));
                    }
                } else {
                    updates.push(removeInventoryItem(userId, existingPartialPackage.id));
                }
            } else if (newPartialQty > 0) {
                // Add new partial package
                 updates.push(addInventoryItem(userId, {
                    name: itemName,
                    originalQuantity: size,
                    totalQuantity: newPartialQty,
                    unit: unit,
                    expiryDate: addDays(new Date(), 7),
                    locationId: originalItems[0]?.locationId || 'pantry-1',
                }));
            }
        }

        await Promise.all(updates);

        const newInventory = await getInventory(userId);
        return { success: true, error: null, newInventory };

    } catch (e) {
        const error = e instanceof Error ? e.message : "An unknown error occurred.";
        console.error("Error updating inventory group:", error);
        return { success: false, error };
    }
}


export async function handleTransferItemToFridge(item: InventoryItem): Promise<InventoryItem> {
    const userId = await getCurrentUserId();
    const today = new Date();
    const threeDaysFromNow = new Date(today.setDate(today.getDate() + 3));
    
    // The new expiry date is 3 days from now or the original expiry date, whichever is sooner.
    const newExpiryDate = item.expiryDate ? new Date(Math.min(threeDaysFromNow.getTime(), new Date(item.expiryDate).getTime())) : threeDaysFromNow;

    const updatedItem: InventoryItem = {
        ...item,
        name: item.name.replace(/\(Freezer\)/i, "(Fridge)").trim(),
        expiryDate: newExpiryDate
    };

    return await updateInventoryItem(userId, updatedItem);
}

export async function handleUpdateMealTime(mealId: string, newTime: string): Promise<{success: boolean, error?: string | null}> {
    const userId = await getCurrentUserId();
    try {
        const updatedMeal = await updateMealTime(userId, mealId, newTime);
        if (updatedMeal) {
            return { success: true };
        } else {
            return { success: false, error: "Meal not found." };
        }
    } catch(e) {
        const error = e instanceof Error ? e.message : "An unknown error occurred.";
        return { success: false, error };
    }
}


export async function handleGenerateRecipeDetails(
    recipeData: Omit<Recipe, "servings" | "macros" | "parsedIngredients">
): Promise<{ recipe: Recipe | null, error: string | null}> {
    try {
        return { recipe: null, error: "AI features are currently under maintenance. Please try again later." };
    } catch (error) {
        console.error("Error generating recipe details:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { recipe: null, error: errorMessage };
    }
}


export async function handleSaveRecipe(recipe: Recipe): Promise<{ success: boolean; error?: string }> {
    const userId = await getCurrentUserId();
    try {
        await saveRecipe(userId, recipe);
        return { success: true };
    } catch (e) {
        const error = e instanceof Error ? e.message : "An unknown error occurred.";
        console.error("Error saving recipe:", error);
        return { success: false, error: "Failed to save the recipe." };
    }
}

export async function handleRemoveInventoryPackageGroup(
  itemsToRemove: InventoryItem[]
): Promise<{ success: boolean; error: string | null; newInventory?: InventoryItem[] }> {
    const userId = await getCurrentUserId();
    try {
        const itemIdsToRemove = itemsToRemove.map(item => item.id);
        await removeInventoryItems(userId, itemIdsToRemove);

        const newInventory = await getInventory(userId);
        return { success: true, error: null, newInventory };
    } catch (e) {
        const error = e instanceof Error ? e.message : "An unknown error occurred.";
        console.error("Error removing inventory package group:", error);
        return { success: false, error };
    }
}

export async function handleMoveInventoryItems(
    request: MoveRequest,
    destinationId: string
): Promise<{ success: boolean; error: string | null; newInventory?: InventoryItem[] }> {
    const userId = await getCurrentUserId();
    try {
        const updates: Promise<any>[] = [];

        for (const sizeStr in request) {
            const size = Number(sizeStr);
            const move = request[size];
            const { fullPackagesToMove, partialAmountToMove, source } = move;

            // Move full packages
            if (fullPackagesToMove > 0) {
                const packagesToMove = source.fullPackages.slice(0, fullPackagesToMove);
                for(const packageToMove of packagesToMove) {
                    updates.push(updateInventoryItem(userId, { ...packageToMove, locationId: destinationId }));
                }
            }

            // Move partial (split) package
            if (partialAmountToMove > 0 && source.partialPackage) {
                const sourcePartial = source.partialPackage;
                
                // 1. Decrease the source package
                const newSourceQuantity = sourcePartial.totalQuantity - partialAmountToMove;
                updates.push(updateInventoryItem(userId, { ...sourcePartial, totalQuantity: newSourceQuantity }));

                // 2. Create a new package at the destination
                updates.push(addInventoryItem(userId, {
                    name: sourcePartial.name,
                    originalQuantity: sourcePartial.originalQuantity,
                    totalQuantity: partialAmountToMove,
                    unit: sourcePartial.unit,
                    expiryDate: sourcePartial.expiryDate,
                    locationId: destinationId,
                }));
            }
        }

        await Promise.all(updates);

        const newInventory = await getInventory(userId);
        return { success: true, error: null, newInventory };

    } catch (e) {
        const error = e instanceof Error ? e.message : "An unknown error occurred.";
        console.error("Error moving inventory items:", error);
        return { success: false, error: "Failed to move items." };
    }
}


export async function handleReportSpoilage(
    request: SpoilageRequest
): Promise<{ success: boolean; error: string | null; newInventory?: InventoryItem[] }> {
    const userId = await getCurrentUserId();
    try {
        const updates: Promise<any>[] = [];

        for (const sizeStr in request) {
            const size = Number(sizeStr);
            const spoilage = request[size];
            const { fullPackagesToSpoil, partialAmountToSpoil, source } = spoilage;

            // Spoil full packages (by removing them)
            if (fullPackagesToSpoil > 0) {
                const packagesToSpoil = source.fullPackages.slice(0, fullPackagesToSpoil);
                for (const packageToSpoil of packagesToSpoil) {
                    updates.push(removeInventoryItem(userId, packageToSpoil.id));
                }
            }

            // Spoil partial package (by reducing its quantity)
            if (partialAmountToSpoil > 0 && source.partialPackage) {
                const sourcePartial = source.partialPackage;
                const newSourceQuantity = sourcePartial.totalQuantity - partialAmountToSpoil;
                updates.push(updateInventoryItem(userId, { ...sourcePartial, totalQuantity: newSourceQuantity }));
            }
        }

        await Promise.all(updates);

        const newInventory = await getInventory(userId);
        return { success: true, error: null, newInventory };

    } catch (e) {
        const error = e instanceof Error ? e.message : "An unknown error occurred.";
        console.error("Error reporting spoilage:", error);
        return { success: false, error: "Failed to report spoilage." };
    }
}




// These functions need to be callable from the client, so they need to be exported from here
// But they also need the userId, which we can only get on the server.
// So we create wrapper functions here.

export async function getClientInventory() {
    const userId = await getCurrentUserId();
    return getInventory(userId);
}

export async function getClientStorageLocations() {
    const userId = await getCurrentUserId();
    return getStorageLocations(userId);
}

export async function getClientSavedRecipes() {
    const userId = await getCurrentUserId();
    return getSavedRecipes(userId);
}

export async function getClientPersonalDetails() {
    const userId = await getCurrentUserId();
    return getPersonalDetails(userId);
}

export async function savePersonalDetails(details: PersonalDetails) {
    const userId = await getCurrentUserId();
    return dataSavePersonalDetails(userId, details);
}


export async function getClientTodaysMacros() {
    const userId = await getCurrentUserId();
    return getTodaysMacros(userId);
}

export async function addClientInventoryItem(item: Omit<InventoryItem, 'id'>) {
    const userId = await getCurrentUserId();
    return addInventoryItem(userId, item);
}

export async function addClientStorageLocation(location: Omit<StorageLocation, 'id'>) {
    const userId = await getCurrentUserId();
    return addStorageLocation(userId, location);
}

export async function updateClientStorageLocation(location: StorageLocation) {
    const userId = await getCurrentUserId();
    return updateStorageLocation(userId, location);
}

export async function removeClientStorageLocation(locationId: string) {
    const userId = await getCurrentUserId();
    return removeStorageLocation(userId, locationId);
}

export async function getSettings() {
    const userId = await getCurrentUserId();
    return dataGetSettings(userId);
}

export async function saveSettings(settings: Settings) {
    const userId = await getCurrentUserId();
    return dataSaveSettings(userId, settings);
}
