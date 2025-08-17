
"use server";

import { generateMealSuggestions } from "@/ai/flows/generate-meal-suggestions";
import { generateShoppingList } from "@/ai/flows/generate-shopping-list";
import { generateSubstitutions } from "@/ai/flows/generate-substitutions";
import { getPersonalDetails, getUnitSystem } from "@/lib/data";
import type { InventoryItem, Recipe, Substitution } from "@/lib/types";
import { z } from "zod";

const suggestionSchema = z.object({
  inventory: z.string().transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val);
      const inventorySchema = z.array(z.object({
        id: z.string(),
        name: z.string(),
        quantity: z.number(),
        unit: z.string(),
        expiryDate: z.string().transform(str => new Date(str)), // Dates are strings in JSON
      }));
      return inventorySchema.parse(parsed);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid inventory format",
      });
      return z.NEVER;
    }
  }),
  cravingsOrMood: z.string().optional(),
   recipeToAdjust: z.string().optional().transform((val, ctx) => {
    if (!val) return undefined;
    try {
        return JSON.parse(val) as Recipe;
    } catch(e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid recipe format" });
        return z.NEVER;
    }
  }),
  newServingSize: z.coerce.number().optional(),
});

function formatInventoryToString(inventory: InventoryItem[]): string {
    if (!inventory || inventory.length === 0) return "None";
    
    // Aggregate quantities for items with the same name
    const aggregatedInventory = inventory.reduce((acc, item) => {
        const key = `${item.name} (${item.unit})`;
        if (acc[key]) {
            acc[key].totalQuantity += item.quantity;
            if (item.expiryDate < acc[key].earliestExpiry) {
                acc[key].earliestExpiry = item.expiryDate;
            }
        } else {
            acc[key] = {
                totalQuantity: item.quantity,
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
    return {
      error: validatedFields.error.flatten().fieldErrors,
      suggestions: null,
      debugInfo: {
        promptInput: log + "Field validation failed.",
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
  inventory: InventoryItem[]
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
        });
        return { substitutions: result.substitutions, error: null };
    } catch (error) {
        console.error(error);
        return { substitutions: null, error: "Failed to generate substitutions. Please try again." };
    }
}
