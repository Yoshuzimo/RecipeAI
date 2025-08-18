
"use server";

import { generateMealSuggestions } from "@/ai/flows/generate-meal-suggestions";
import { generateShoppingList } from "@/ai/flows/generate-shopping-list";
import { generateSubstitutions } from "@/ai/flows/generate-substitutions";
import { logCookedMeal } from "@/ai/flows/log-cooked-meal";
import { generateRecipeDetails } from "@/ai/flows/generate-recipe-details";
import { getPersonalDetails, getUnitSystem, updateInventoryItem, addInventoryItem, removeInventoryItem, getInventory, logMacros, updateMealTime, saveRecipe, removeInventoryItems, seedInitialData, getStorageLocations, getSavedRecipes, getTodaysMacros, addStorageLocation, updateStorageLocation, removeStorageLocation, getSettings as dataGetSettings, saveSettings as dataSaveSettings, savePersonalDetails as dataSavePersonalDetails } from "@/lib/data";
import type { InventoryItem, LeftoverDestination, Recipe, Substitution, RecipeIngredient, InventoryPackageGroup, Unit, MoveRequest, SpoilageRequest, StorageLocation, Settings, PersonalDetails } from "@/lib/types";
import { addDays, parseISO } from "date-fns";
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


const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  totalQuantity: z.number(),
  originalQuantity: z.number(),
  unit: z.enum(["g", "kg", "ml", "l", "pcs", "oz", "lbs", "fl oz", "gallon"]),
  expiryDate: z.string().transform(str => new Date(str)), // Dates are strings in JSON
  locationId: z.string(),
});

const suggestionSchema = z.object({
  inventory: z.string().transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val);
      // This is a simplified validation. A more robust solution might use a more detailed schema.
      return parsed as InventoryItem[];
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid inventory format",
      });
      return z.NEVER;
    }
  }),
  cravingsOrMood: z.string().optional(),
  recipeToAdjust: z.string().nullable().optional().transform((val, ctx) => {
    if (!val || val === 'null' || val === 'undefined') return undefined;
    try {
        const parsedRecipe = JSON.parse(val);
        // We can add a more specific zod schema for Recipe if needed
        return parsedRecipe as Recipe;
    } catch(e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid recipe format" });
        return z.NEVER;
    }
  }),
  newServingSize: z.string().nullable().optional().transform(val => val ? parseInt(val, 10) : undefined),
});


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

// Simple parser for ingredients. A more sophisticated NLP-based parser would be better.
function parseIngredients(ingredients: string[]): RecipeIngredient[] {
    return ingredients.map(ing => {
        // This is a very basic parser, assuming the name is the main part.
        // It doesn't handle quantities well, but gives the AI the parts.
        const name = ing.split(',')[0].trim();
        const notes = ing.includes(',') ? ing.substring(ing.indexOf(',') + 1).trim() : undefined;
        return { name, notes };
    });
}


export async function handleGenerateSuggestions(formData: FormData) {
  const userId = await getCurrentUserId();
  const validatedFields = suggestionSchema.safeParse({
    inventory: formData.get("inventory"),
    cravingsOrMood: formData.get("cravingsOrMood"),
    recipeToAdjust: formData.get("recipeToAdjust"),
    newServingSize: formData.get("newServingSize"),
  });
  
  if (!validatedFields.success) {
    const errorDetails = JSON.stringify(validatedFields.error.flatten(), null, 2);
    return {
      error: validatedFields.error.flatten().fieldErrors,
      suggestions: null,
      debugInfo: {
        promptInput: "Validation Failed",
        rawResponse: "Validation Errors:\n" + errorDetails
      }
    };
  }

  const { inventory, cravingsOrMood, recipeToAdjust, newServingSize } = validatedFields.data;
  
  if (recipeToAdjust && newServingSize) {
    try {
        const unitSystem = await getUnitSystem(userId);
        const result = await generateMealSuggestions({
            recipeToAdjust: recipeToAdjust,
            newServingSize: newServingSize,
            unitSystem: unitSystem,
            // Pass dummy data for other fields as they aren't used for adjustments
            currentInventory: "",
            expiringIngredients: "",
            personalDetails: "",
            todaysMacros: { protein: 0, carbs: 0, fat: 0 },
        });
        // The AI returns the single adjusted recipe inside the suggestions array
        const adjustedRecipe = result.suggestions[0];
        // We need to return it in a way that the frontend can replace the original
        return {
            suggestions: null, // No new suggestions
            adjustedRecipe: { ...adjustedRecipe, parsedIngredients: parseIngredients(adjustedRecipe.ingredients) },
            originalRecipeTitle: recipeToAdjust.title,
            error: null,
             debugInfo: {
                promptInput: result.promptInput ? JSON.stringify(result.promptInput, null, 2) : "Prompt for recipe adjustment.",
                rawResponse: result.rawOutput
            }
        };
    } catch(e) {
        console.error("Error adjusting recipe", e);
        return { error: { form: ["Failed to adjust recipe. Please try again."] }, suggestions: null };
    }
  }


  const now = new Date();
  const expiringSoonThreshold = new Date();
  expiringSoonThreshold.setDate(now.getDate() + 3);

  const expiringIngredients = inventory.filter(
    (item) => {
        if (!item.expiryDate) return false;
        const itemExpiryDate = new Date(item.expiryDate);
        return itemExpiryDate > now && itemExpiryDate <= expiringSoonThreshold
    }
  );

  const currentInventoryString = formatInventoryToString(inventory);
  const expiringIngredientsString = formatInventoryToString(expiringIngredients);
  const unitSystem = await getUnitSystem(userId);
  const personalDetails = await getPersonalDetails(userId);
  const personalDetailsString = JSON.stringify(personalDetails, null, 2);

  // In a real app, this data would come from the user's daily log
  const mockTodaysMacros = { protein: 95, carbs: 155, fat: 65 };

  const promptInput = {
      cravingsOrMood,
      currentInventory: currentInventoryString,
      expiringIngredients: expiringIngredientsString,
      unitSystem,
      personalDetails: personalDetailsString,
      todaysMacros: mockTodaysMacros,
      specializedEquipment: personalDetails.specializedEquipment,
    };

  try {
    const result = await generateMealSuggestions(promptInput);
    const suggestionsWithParsed = result.suggestions.map(recipe => ({
        ...recipe,
        parsedIngredients: parseIngredients(recipe.ingredients),
    }))

    return { 
        suggestions: suggestionsWithParsed,
        error: null, 
        debugInfo: {
            promptInput: JSON.stringify(promptInput, null, 2),
            rawResponse: result.rawOutput
        }
    };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
        error: { form: ["Failed to generate suggestions. Please try again."] }, 
        suggestions: null,
        debugInfo: {
            promptInput: JSON.stringify(promptInput, null, 2),
            rawResponse: "Error occurred:\n" + errorMessage
        }
    };
  }
}

export async function handleGenerateShoppingList(
  inventory: InventoryItem[],
  personalDetails: any // In a real app, this would be fetched securely
) {
  const userId = await getCurrentUserId();
  const currentInventoryString = formatInventoryToString(inventory);
  
  // In a real app, this would be real data.
  const consumptionHistory = "User has eaten a lot of chicken, broccoli, and rice this month.";

  const personalDetailsString = JSON.stringify(personalDetails, null, 2);
  const unitSystem = await getUnitSystem(userId);

  try {
    const result = await generateShoppingList({
      currentInventory: currentInventoryString,
      personalDetails: personalDetailsString,
      consumptionHistory,
      unitSystem,
    });
    return { shoppingList: result.shoppingList, error: null };
  } catch (error) {
    console.error(error);
    return { error: "Failed to generate shopping list. Please try again.", shoppingList: null };
  }
}

export async function handleGenerateSubstitutions(
  recipe: Recipe,
  ingredientsToReplace: string[],
  inventory: InventoryItem[],
  allowExternalSuggestions: boolean,
): Promise<{ substitutions: Substitution[] | null, error: string | null}> {
    const userId = await getCurrentUserId();
    const currentInventoryString = formatInventoryToString(inventory);
    const unitSystem = await getUnitSystem(userId);
    const personalDetails = await getPersonalDetails(userId);
    const personalDetailsString = JSON.stringify(personalDetails, null, 2);
    
    try {
        const result = await generateSubstitutions({
            recipe,
            ingredientsToReplace,
            currentInventory: currentInventoryString,
            personalDetails: personalDetailsString,
            unitSystem,
            allowExternalSuggestions,
        });
        return { substitutions: result.substitutions, error: null };
    } catch (error) {
        console.error(error);
        return { substitutions: null, error: "Failed to generate substitutions. Please try again." };
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
    const inventory = await getInventory(userId);
    const unitSystem = await getUnitSystem(userId);

    const inventoryForAI = inventory.map(item => ({
        ...item,
        expiryDate: item.expiryDate ? item.expiryDate.toISOString() : null,
    }));

    try {
        const result = await logCookedMeal({
            recipe: {
                title: recipe.title,
                parsedIngredients: recipe.parsedIngredients,
                servings: recipe.servings,
                macros: recipe.macros
            },
            currentInventory: inventoryForAI,
            servingsEaten,
            servingsEatenByOthers,
            fridgeLeftovers,
            freezerLeftovers,
            unitSystem
        });
        
        // Apply inventory updates from AI
        for (const update of result.inventoryUpdates) {
            const itemToUpdate = inventory.find(i => i.id === update.itemId);
            if (itemToUpdate) {
                await updateInventoryItem(userId, {
                    ...itemToUpdate,
                    totalQuantity: update.newQuantity,
                });
            }
        }
        
        // Add new leftover items to inventory
        if (result.leftoverItems && result.leftoverItems.length > 0) {
            for (const leftover of result.leftoverItems) {
                if (leftover.quantity > 0) {
                    const expiryDate = new Date();
                    const isFreezer = leftover.locationId.includes('freezer');
                    expiryDate.setDate(expiryDate.getDate() + (isFreezer ? 60 : 3)); // 3 days for fridge, 60 for freezer
                    
                    await addInventoryItem(userId, {
                        name: leftover.name,
                        totalQuantity: leftover.quantity,
                        originalQuantity: leftover.quantity,
                        unit: 'pcs', // Leftovers are in "pieces" or servings
                        expiryDate,
                        locationId: leftover.locationId,
                    });
                }
            }
        }
        
        // Log the consumed macros
        if (result.macrosConsumed) {
            await logMacros(userId, mealType, recipe.title, result.macrosConsumed);
        }

        const newInventory = await getInventory(userId);
        return { success: true, error: null, newInventory };

    } catch (error) {
        console.error("Error logging cooked meal:", error);
        return { success: false, error: "Failed to log meal. AI service might be down." };
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
    const userId = await getCurrentUserId();
    try {
        const result = await generateRecipeDetails(recipeData);
        // The AI returns the full recipe, we just need to add the parsed ingredients client-side
        const finalRecipe: Recipe = {
            ...result.recipe,
            parsedIngredients: parseIngredients(result.recipe.ingredients)
        }
        return { recipe: finalRecipe, error: null };
    } catch (error) {
        console.error("Error finalizing recipe details:", error);
        const errorMessage = error instanceof Error ? error.message : "AI service failed to process the recipe.";
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
