
"use server";

import { generateMealSuggestions } from "@/ai/flows/generate-meal-suggestions";
import { generateShoppingList } from "@/ai/flows/generate-shopping-list";
import { generateSubstitutions } from "@/ai/flows/generate-substitutions";
import { getPersonalDetails, getUnitSystem } from "@/lib/data";
import type { InventoryItem, Recipe, Substitution } from "@/lib/types";
import { z } from "zod";

const suggestionSchema = z.object({
  cravingsOrMood: z.string().optional(),
  recipeToAdjust: z.string().optional(),
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

export async function handleGenerateSuggestions(
  inventory: InventoryItem[],
  prevState: any,
  formData: FormData
) {
  const validatedFields = suggestionSchema.safeParse({
    cravingsOrMood: formData.get("cravingsOrMood"),
    recipeToAdjust: formData.get("recipeToAdjust"),
    newServingSize: formData.get("newServingSize"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
      suggestions: null
    };
  }

  const { cravingsOrMood, recipeToAdjust, newServingSize } = validatedFields.data;
  
  if (recipeToAdjust && newServingSize) {
    try {
        const recipe: Recipe = JSON.parse(recipeToAdjust);
        const result = await generateMealSuggestions({
            recipeToAdjust: recipe,
            newServingSize: newServingSize,
            unitSystem: await getUnitSystem(),
            // Pass dummy data for other fields as they aren't used for adjustments
            currentInventory: "",
            expiringIngredients: "",
            personalDetails: "",
            todaysMacros: { protein: 0, carbs: 0, fat: 0 },
            mealsEatenToday: [],
        });
        // The AI returns the single adjusted recipe inside the suggestions array
        const adjustedRecipe = result.suggestions[0];
        // We need to return it in a way that the frontend can replace the original
        return {
            suggestions: null, // No new suggestions
            adjustedRecipe: adjustedRecipe,
            originalRecipeTitle: recipe.title,
            error: null
        };
    } catch(e) {
        console.error("Error adjusting recipe", e);
        return { error: { form: "Failed to adjust recipe. Please try again." }, suggestions: null };
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
  const mockMealsEatenToday = ["Oatmeal with berries", "Chicken salad wrap"];


  try {
    const result = await generateMealSuggestions({
      cravingsOrMood,
      currentInventory: currentInventoryString,
      expiringIngredients: expiringIngredientsString,
      unitSystem,
      personalDetails: personalDetailsString,
      todaysMacros: mockTodaysMacros,
      mealsEatenToday: mockMealsEatenToday,
    });
    return { suggestions: result.suggestions, error: null, inventory };
  } catch (error) {
    console.error(error);
    return { error: { form: "Failed to generate suggestions. Please try again." }, suggestions: null };
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
