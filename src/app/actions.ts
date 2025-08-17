"use server";

import { generateMealSuggestions } from "@/ai/flows/generate-meal-suggestions";
import type { InventoryItem } from "@/lib/types";
import { z } from "zod";

const suggestionSchema = z.object({
  dietaryPreferences: z.string().min(1, "Dietary preferences are required."),
});

function formatInventoryToString(inventory: InventoryItem[]): string {
    if (!inventory || inventory.length === 0) return "None";
    return inventory.map(item => `${item.name} (${item.quantity}${item.unit}, expires ${item.expiryDate.toLocaleDateString()})`).join(', ');
}

export async function handleGenerateSuggestions(
  inventory: InventoryItem[],
  prevState: any,
  formData: FormData
) {
  const validatedFields = suggestionSchema.safeParse({
    dietaryPreferences: formData.get("dietaryPreferences"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  const dietaryPreferences = validatedFields.data.dietaryPreferences;
  
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
      dietaryPreferences,
      currentInventory: currentInventoryString,
      expiringIngredients: expiringIngredientsString,
    });
    return { suggestions: result.suggestions, error: null };
  } catch (error) {
    console.error(error);
    return { error: "Failed to generate suggestions. Please try again.", suggestions: null };
  }
}
