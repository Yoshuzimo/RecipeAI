"use server";

import { generateMealSuggestions } from "@/ai/flows/generate-meal-suggestions";
import { generateShoppingList } from "@/ai/flows/generate-shopping-list";
import type { InventoryItem } from "@/lib/types";
import { z } from "zod";

const suggestionSchema = z.object({
  cravingsOrMood: z.string().min(1, "This field is required."),
});

function formatInventoryToString(inventory: InventoryItem[]): string {
    if (!inventory || inventory.length === 0) return "None";
    
    // Aggregate quantities for items with the same name
    const aggregatedInventory = inventory.reduce((acc, item) => {
        if (acc[item.name]) {
            acc[item.name].totalQuantity += item.quantity;
            if (item.expiryDate < acc[item.name].earliestExpiry) {
                acc[item.name].earliestExpiry = item.expiryDate;
            }
        } else {
            acc[item.name] = {
                totalQuantity: item.quantity,
                unit: item.unit,
                earliestExpiry: item.expiryDate
            };
        }
        return acc;
    }, {} as Record<string, { totalQuantity: number; unit: string; earliestExpiry: Date }>);

    return Object.entries(aggregatedInventory)
        .map(([name, data]) => 
            `${name} (${data.totalQuantity}${data.unit}, expires ~${data.earliestExpiry.toLocaleDateString()})`
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
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  const cravingsOrMood = validatedFields.data.cravingsOrMood;
  
  const now = new Date();
  const expiringSoonThreshold = new Date();
  expiringSoonThreshold.setDate(now.getDate() + 3);

  const expiringIngredients = inventory.filter(
    (item) => item.expiryDate > now && item.expiryDate <= expiringSoonThreshold
  );

  const currentInventoryString = formatInventoryToString(inventory);
  const expiringIngredientsString = formatInventoryToString(expiringIngredients);

  try {
    const result = await generateMealSuggestions({
      cravingsOrMood,
      currentInventory: currentInventoryString,
      expiringIngredients: expiringIngredientsString,
    });
    return { suggestions: result.suggestions, error: null };
  } catch (error) {
    console.error(error);
    return { error: "Failed to generate suggestions. Please try again.", suggestions: null };
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

  try {
    const result = await generateShoppingList({
      currentInventory: currentInventoryString,
      personalDetails: personalDetailsString,
      consumptionHistory,
    });
    return { shoppingList: result.shoppingList, error: null };
  } catch (error) {
    console.error(error);
    return { error: "Failed to generate shopping list. Please try again.", shoppingList: null };
  }
}
