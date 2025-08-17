
'use server';

/**
 * @fileOverview This file defines a Genkit flow for logging a cooked meal, deducting ingredients from inventory,
 * and creating a new leftover inventory item. This flow is responsible for unit conversions.
 *
 * - logCookedMeal - A function that processes the cooking of a recipe.
 * - LogCookedMealInput - The input type for the function.
 * - LogCookedMealOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LeftoverDestinationSchema = z.object({
  locationId: z.string().describe("The ID of the storage location (e.g., 'fridge-1')."),
  servings: z.number().describe("The number of servings being stored in this location."),
});

const InventoryItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    totalQuantity: z.number(),
    unit: z.enum(["g", "kg", "ml", "l", "pcs", "oz", "lbs", "fl oz", "gallon"]),
    expiryDate: z.string(),
    locationId: z.string(),
});

const RecipeIngredientSchema = z.object({
    name: z.string(),
    notes: z.string().optional(),
});

const LogCookedMealInputSchema = z.object({
  recipe: z.object({
    title: z.string(),
    parsedIngredients: z.array(RecipeIngredientSchema),
    servings: z.number(),
    macros: z.object({
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
    }),
  }),
  currentInventory: z.array(InventoryItemSchema).describe("A list of all items currently in the user's inventory."),
  servingsEaten: z.number().describe("The number of servings eaten by the user."),
  servingsEatenByOthers: z.number().describe("The number of servings eaten by others (for calculation purposes only)."),
  fridgeLeftovers: z.array(LeftoverDestinationSchema).describe("A list of fridge locations and the number of servings to store in each."),
  freezerLeftovers: z.array(LeftoverDestinationSchema).describe("A list of freezer locations and the number of servings to store in each."),
  unitSystem: z.enum(["us", "metric"]),
});
export type LogCookedMealInput = z.infer<typeof LogCookedMealInputSchema>;


const LogCookedMealOutputSchema = z.object({
    inventoryUpdates: z.array(z.object({
        itemId: z.string().describe("The ID of the inventory item to update."),
        newQuantity: z.number().describe("The new totalQuantity for the inventory item. If the item is fully used, this should be 0.")
    })).describe("A list of inventory items to update with their new quantities."),
    leftoverItems: z.array(z.object({
        name: z.string().describe("The name of the leftover item to be created (e.g., 'Leftover - Recipe Title')."),
        quantity: z.number().describe("The number of servings remaining."),
        locationId: z.string().describe("The storage location ID for these leftovers."),
    })).describe("A list of leftover items to be added to the inventory. Can be empty if no servings are left."),
    macrosConsumed: z.object({
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
    }).describe("The total macronutrients consumed by the user from the servings eaten."),
});
export type LogCookedMealOutput = z.infer<typeof LogCookedMealOutputSchema>;

export async function logCookedMeal(
  input: LogCookedMealInput
): Promise<LogCookedMealOutput> {
  return logCookedMealFlow(input);
}

const prompt = ai.definePrompt({
  name: 'logCookedMealPrompt',
  input: {schema: LogCookedMealInputSchema},
  output: {schema: LogCookedMealOutputSchema},
  prompt: `You are an intelligent inventory and nutrition logging assistant. The user has cooked a recipe.

**Your Primary Task:**
Accurately calculate the new quantity for each inventory item used in the recipe and determine the leftover details. You MUST perform unit conversions where necessary.

**Unit Conversion Table (use these for all calculations):**
*   1 lb = 16 oz = 453.592 g
*   1 kg = 1000 g = 2.20462 lbs
*   1 gallon = 4 quarts = 8 pints = 16 cups = 128 fl oz = 3.785 L
*   1 L = 1000 mL
*   1 cup = 8 fl oz = 236.588 mL
*   For "pcs" (pieces), you must use reasonable estimations. Examples:
    *   1 medium chicken breast is about 6-8 oz.
    *   1 large egg is about 2 oz.
    *   1 medium apple is about 6 oz.
    *   Use the ingredient name and notes to make the best estimation.

**Detailed Instructions:**
1.  **Analyze Recipe Ingredients**: For each ingredient in 'recipe.parsedIngredients', determine how much of it is needed for the recipe.
2.  **Match to Inventory**: Find the corresponding item(s) in the 'currentInventory'. You should match by name. If multiple packages exist (e.g., one in fridge, one in freezer), deduct from the one with the earliest expiry date first.
3.  **Calculate Deduction**:
    *   Convert the recipe ingredient's unit to the inventory item's unit if they differ.
    *   Calculate the new 'totalQuantity' for the affected inventory item. \`newQuantity = currentQuantity - usedQuantity\`.
    *   The 'newQuantity' cannot be negative. If more is required than available, use up the entire package and set 'newQuantity' to 0.
4.  **Create Inventory Updates**: For every inventory item that was used, create an object in the 'inventoryUpdates' array containing the 'itemId' and the calculated 'newQuantity'.
5.  **Create Leftover Items**: Based on 'fridgeLeftovers' and 'freezerLeftovers', create new items for the 'leftoverItems' array. Only create items if servings > 0. The name for all leftovers should be "Leftover - {{{recipe.title}}}".
6.  **Calculate Macros**: Calculate the total protein, carbs, and fat consumed **by the user only**. This is (servingsEaten * macros per serving).

**User's Context:**
*   **Recipe Cooked:** {{{recipe.title}}} (Total Servings Made: {{{recipe.servings}}})
*   **Recipe Ingredients Used:** 
{{#each recipe.parsedIngredients}}
- {{{this.name}}} {{#if this.notes}}({{{this.notes}}}){{/if}}
{{/each}}
*   **Macros Per Serving:** Protein: {{{recipe.macros.protein}}}g, Carbs: {{{recipe.macros.carbs}}}g, Fat: {{{recipe.macros.fat}}}g
*   **Servings Eaten by User:** {{{servingsEaten}}}
*   **Servings Eaten by Others:** {{{servingsEatenByOthers}}}
*   **Leftovers to Fridge:** 
{{#each fridgeLeftovers}}
- {{{this.servings}}} servings to location {{{this.locationId}}}
{{/each}}
*   **Leftovers to Freezer:** 
{{#each freezerLeftovers}}
- {{{this.servings}}} servings to location {{{this.locationId}}}
{{/each}}
*   **Current Inventory (Before Cooking):** 
{{#each currentInventory}}
- ID: {{{this.id}}}, Name: {{{this.name}}}, Qty: {{{this.totalQuantity}}}{{{this.unit}}}, Expires: {{{this.expiryDate}}}, Location: {{{this.locationId}}}
{{/each}}
*   **Unit System:** {{{unitSystem}}}

Generate the precise \`inventoryUpdates\`, \`leftoverItems\`, and \`macrosConsumed\`.
`,
});

const logCookedMealFlow = ai.defineFlow(
  {
    name: 'logCookedMealFlow',
    inputSchema: LogCookedMealInputSchema,
    outputSchema: LogCookedMealOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
