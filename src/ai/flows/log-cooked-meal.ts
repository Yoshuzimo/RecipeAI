
'use server';
/**
 * @fileoverview A flow that calculates inventory changes after a meal is cooked.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { InventoryItem, Recipe, Unit, LeftoverDestination, StorageLocation, PersonalDetails } from '@/lib/types';


const ItemUpdateSchema = z.object({
    itemId: z.string().describe("The ID of the inventory item to update."),
    newQuantity: z.number().describe("The new quantity of the item after deduction. If 0, the item should be removed."),
});

const NewLeftoverSchema = z.object({
    name: z.string().describe("The name for the new leftover item, e.g., 'Leftover - Chicken Curry'."),
    originalQuantity: z.number().describe("The number of servings created."),
    totalQuantity: z.number().describe("The number of servings created."),
    unit: z.literal('pcs').describe("The unit, which should always be 'pcs' for leftovers."),
    expiryDate: z.date().describe("An estimated expiry date for the leftover item."),
    locationId: z.string().describe("The ID of the storage location where the leftovers are being placed."),
});


export const LogCookedMealInputSchema = z.object({
  recipe: z.string().describe("The JSON string of the full recipe object that was cooked."),
  inventory: z.string().describe("The user's current inventory as a JSON string."),
  servingsEaten: z.number().int().min(0).describe("Number of servings eaten by the current user."),
  servingsEatenByOthers: z.number().int().min(0).describe("Number of servings eaten by other household members."),
  fridgeLeftovers: z.string().describe("JSON string of servings to be stored as leftovers in the fridge."),
  freezerLeftovers: z.string().describe("JSON string of servings to be stored as leftovers in the freezer."),
  storageLocations: z.string().describe("JSON string of available storage locations."),
});

export const LogCookedMealOutputSchema = z.object({
    itemUpdates: z.array(ItemUpdateSchema).describe("A list of inventory items to update (by reducing their quantity)."),
    itemsToRemove: z.array(z.string()).describe("A list of inventory item IDs to remove completely (quantity is zero)."),
    newLeftovers: z.array(NewLeftoverSchema).describe("A list of new leftover items to add to the inventory."),
});

export type LogCookedMealInput = z.infer<typeof LogCookedMealInputSchema>;
export type LogCookedMealOutput = z.infer<typeof LogCookedMealOutputSchema>;


const logCookedMealPrompt = ai.definePrompt({
    name: 'logCookedMealPrompt',
    input: { schema: z.any() },
    output: { schema: LogCookedMealOutputSchema },
    prompt: `
        You are an inventory management AI. A user has just cooked a meal and you need to calculate the changes to their inventory.

        **Recipe Cooked:** {{{recipe.title}}} (Servings made: {{{recipe.servings}}})
        
        **Recipe Ingredients:**
        {{#each recipe.parsedIngredients}}
        - {{{this.name}}} ({{{this.notes}}})
        {{/each}}
        
        **Current Inventory:** {{{inventory}}}
        
        **Distribution of Servings:**
        - Eaten Now (User): {{{servingsEaten}}}
        - Eaten Now (Others): {{{servingsEatenByOthers}}}
        - Leftovers to Fridge: {{{fridgeLeftovers}}}
        - Leftovers to Freezer: {{{freezerLeftovers}}}

        **Your Task:**
        1.  **Deduct Ingredients:** For each ingredient in the recipe, determine which inventory item it corresponds to and calculate the new quantity. You will need to be smart about matching, e.g., "flour" in recipe matches "all-purpose flour" in inventory. Deduct a proportional amount of each ingredient based on the total servings made. Assume the recipe used all listed ingredients for the total servings.
        2.  **Create Leftovers:** For the leftover servings, create new inventory items. 
            - Name them appropriately (e.g., "Leftover - {{{recipe.title}}}").
            - The quantity should be the number of servings. The unit should be 'pcs'.
            - Estimate a reasonable expiry date (e.g., 3-4 days for fridge, 1-2 months for freezer).
            - Use the provided location IDs.
        3.  **Return the Result:** Populate the \`itemUpdates\`, \`itemsToRemove\`, and \`newLeftovers\` fields.
            - If an item's quantity is reduced, add it to \`itemUpdates\`.
            - If an item's quantity becomes zero, add its ID to \`itemsToRemove\`.
            - Add all new leftover items to \`newLeftovers\`.
    `,
});

export const logCookedMealFlow = ai.defineFlow(
  {
    name: 'logCookedMealFlow',
    inputSchema: LogCookedMealInputSchema,
    outputSchema: LogCookedMealOutputSchema,
  },
  async (input) => {
    const parsedInput = {
      ...input,
      recipe: JSON.parse(input.recipe) as Recipe,
      inventory: JSON.parse(input.inventory) as InventoryItem[],
      fridgeLeftovers: JSON.parse(input.fridgeLeftovers) as LeftoverDestination[],
      freezerLeftovers: JSON.parse(input.freezerLeftovers) as LeftoverDestination[],
      storageLocations: JSON.parse(input.storageLocations) as StorageLocation[],
    };
    const { output } = await logCookedMealPrompt(parsedInput);
    return output!;
  }
);


export async function logCookedMeal(input: LogCookedMealInput): Promise<LogCookedMealOutput> {
    return await logCookedMealFlow(input);
}
