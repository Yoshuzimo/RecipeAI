
"use server";

import { generateMealSuggestions } from "@/ai/flows/generate-meal-suggestions";
import { generateShoppingList } from "@/ai/flows/generate-shopping-list";
import { generateSubstitutions } from "@/ai/flows/generate-substitutions";
import { logCookedMeal } from "@/ai/flows/log-cooked-meal";
import { getPersonalDetails, getUnitSystem, updateInventoryItem, addInventoryItem, removeInventoryItem, getInventory, logMacros, updateMealTime } from "@/lib/data";
import type { InventoryItem, LeftoverDestination, Recipe, Substitution } from "@/lib/types";
import { addDays } from "date-fns";
import { z } from "zod";

const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  packageSize: z.number(),
  packageCount: z.number(),
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

function formatInventoryToString(inventory: InventoryItem[]): string {
    if (!inventory || inventory.length === 0) return "None";
    
    // Aggregate quantities for items with the same name
    const aggregatedInventory = inventory.reduce((acc, item) => {
        const key = `${item.name} (${item.unit})`;
        if (acc[key]) {
            acc[key].totalQuantity += (item.packageSize * item.packageCount);
            if (item.expiryDate < acc[key].earliestExpiry) {
                acc[key].earliestExpiry = item.expiryDate;
            }
        } else {
            acc[key] = {
                totalQuantity: (item.packageSize * item.packageCount),
                unit: item.unit,
                earliestExpiry: item.expiryDate,
                name: item.name,
            };
        }
        return acc;
    }, {} as Record<string, {name: string, totalQuantity: number; unit: string; earliestExpiry: Date }>);

    return Object.values(aggregatedInventory)
        .map(data => 
            `${data.name} (${data.totalQuantity.toFixed(1)}${data.unit}, expires ~${data.earliestExpiry.toLocaleDateString()})`
        )
        .join(', ');
}

export async function handleGenerateSuggestions(formData: FormData) {
  let log = "Button clicked.\n";
  const validatedFields = suggestionSchema.safeParse({
    inventory: formData.get("inventory"),
    cravingsOrMood: formData.get("cravingsOrMood"),
    recipeToAdjust: formData.get("recipeToAdjust"),
    newServingSize: formData.get("newServingSize"),
  });
  
  log += "Request received by server action.\n";

  if (!validatedFields.success) {
    const errorDetails = JSON.stringify(validatedFields.error.flatten(), null, 2);
    log += "Field validation failed.\n";
    return {
      error: validatedFields.error.flatten().fieldErrors,
      suggestions: null,
      debugInfo: {
        promptInput: log,
        rawResponse: "Validation Errors:\n" + errorDetails
      }
    };
  }

  const { inventory, cravingsOrMood, recipeToAdjust, newServingSize } = validatedFields.data;
  
  if (recipeToAdjust && newServingSize) {
    try {
        const result = await generateMealSuggestions({
            recipeToAdjust: recipeToAdjust,
            newServingSize: newServingSize,
            unitSystem: await getUnitSystem(),
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
            adjustedRecipe: adjustedRecipe,
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
    (item) => item.expiryDate > now && item.expiryDate <= expiringSoonThreshold
  );

  const currentInventoryString = formatInventoryToString(inventory);
  const expiringIngredientsString = formatInventoryToString(expiringIngredients);
  const unitSystem = await getUnitSystem();
  const personalDetails = await getPersonalDetails();
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
    };
  
  log += "Prompt compiled.\n\n" + JSON.stringify(promptInput, null, 2);

  try {
    const result = await generateMealSuggestions(promptInput);
    return { 
        suggestions: result.suggestions, 
        error: null, 
        debugInfo: {
            promptInput: log,
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
            promptInput: log,
            rawResponse: "Error occurred:\n" + errorMessage
        }
    };
  }
}

export async function handleGenerateShoppingList(
  inventory: InventoryItem[],
  personalDetails: any // In a real app, this would be fetched securely
) {
  const currentInventoryString = formatInventoryToString(inventory);
  
  // In a real app, this would be real data.
  const consumptionHistory = "User has eaten a lot of chicken, broccoli, and rice this month.";

  const personalDetailsString = JSON.stringify(personalDetails, null, 2);
  const unitSystem = await getUnitSystem();

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
    const currentInventoryString = formatInventoryToString(inventory);
    const unitSystem = await getUnitSystem();
    const personalDetails = await getPersonalDetails();
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
    const inventory = await getInventory();
    const currentInventoryString = formatInventoryToString(inventory);
    const unitSystem = await getUnitSystem();

    try {
        const result = await logCookedMeal({
            recipe,
            currentInventory: currentInventoryString,
            servingsEaten,
            servingsEatenByOthers,
            fridgeLeftovers,
            freezerLeftovers,
            unitSystem
        });

        // This is a simplified deduction logic. A real app would need to parse AI response
        // and match it precisely with inventory items, which is very complex.
        // For this demo, we'll just assume the first ingredient was used up.
        // A more robust solution would be implemented in a real application.
        if (inventory.length > 0) {
           // Simplified logic for demo purposes
        }
        
        // Add new leftover items to inventory
        if (result.leftoverItems && result.leftoverItems.length > 0) {
            for (const leftover of result.leftoverItems) {
                if (leftover.quantity > 0) {
                    const expiryDate = new Date();
                    const isFreezer = leftover.locationId.includes('freezer');
                    expiryDate.setDate(expiryDate.getDate() + (isFreezer ? 60 : 3)); // 3 days for fridge, 60 for freezer
                    
                    await addInventoryItem({
                        name: leftover.name,
                        packageSize: leftover.quantity,
                        packageCount: 1,
                        unit: 'pcs', // Leftovers are in "pieces" or servings
                        expiryDate,
                        locationId: leftover.locationId,
                    });
                }
            }
        }
        
        // Log the consumed macros
        if (result.macrosConsumed) {
            await logMacros(mealType, recipe.title, result.macrosConsumed);
        }

        const newInventory = await getInventory();
        return { success: true, error: null, newInventory };

    } catch (error) {
        console.error("Error logging cooked meal:", error);
        return { success: false, error: "Failed to log meal. AI service might be down." };
    }
}

export async function handleTransferItemToFridge(item: InventoryItem): Promise<InventoryItem> {
    const today = new Date();
    const threeDaysFromNow = new Date(today.setDate(today.getDate() + 3));
    
    // The new expiry date is 3 days from now or the original expiry date, whichever is sooner.
    const newExpiryDate = new Date(Math.min(threeDaysFromNow.getTime(), item.expiryDate.getTime()));

    const updatedItem: InventoryItem = {
        ...item,
        name: item.name.replace(/\(Freezer\)/i, "(Fridge)").trim(),
        expiryDate: newExpiryDate
    };

    return await updateInventoryItem(updatedItem);
}

export async function handleUpdateMealTime(mealId: string, newTime: string): Promise<{success: boolean, error?: string | null}> {
    try {
        const updatedMeal = await updateMealTime(mealId, newTime);
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
