
'use server';

/**
 * @fileOverview This file defines a Genkit flow for logging a cooked meal, deducting ingredients from inventory,
 * and creating a new leftover inventory item.
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

const LogCookedMealInputSchema = z.object({
  recipe: z.object({
    title: z.string(),
    ingredients: z.array(z.string()),
    servings: z.number(),
    macros: z.object({
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
    }),
  }),
  currentInventory: z.string().describe("A comma-separated list of ingredients currently in the user's inventory, including quantities and expiration dates."),
  servingsEaten: z.number().describe("The number of servings eaten by the user."),
  servingsEatenByOthers: z.number().describe("The number of servings eaten by others (for calculation purposes only)."),
  fridgeLeftovers: z.array(LeftoverDestinationSchema).describe("A list of fridge locations and the number of servings to store in each."),
  freezerLeftovers: z.array(LeftoverDestinationSchema).describe("A list of freezer locations and the number of servings to store in each."),
  unitSystem: z.enum(["us", "metric"]),
});
export type LogCookedMealInput = z.infer<typeof LogCookedMealInputSchema>;


const LogCookedMealOutputSchema = z.object({
    updatedInventory: z.string().describe("The user's inventory after deducting the recipe ingredients. This should be a list of items to remove or update."),
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
  prompt: `You are an inventory and nutrition logging assistant for a recipe app. The user has just cooked a recipe. 

Your tasks are:
1.  **Deduct Ingredients**: Analyze the recipe's ingredients and determine which items need to be removed or have their quantities reduced from the user's current inventory. The output should only be the items that need to be changed.
2.  **Create Leftover Items**: Based on the 'fridgeLeftovers' and 'freezerLeftovers' input, create new leftover inventory items for each destination that has servings.
    - The name for all leftovers should be "Leftover - {{{recipe.title}}}".
3.  **Calculate Macros**: Calculate the total protein, carbs, and fat consumed **by the user only**. This is (servingsEaten * macros per serving).
4.  **Format Output**: Provide a list of inventory updates, a list of new leftover items, and the total consumed macros.

**User's Context:**
*   **Recipe Cooked:** {{{recipe.title}}}
*   **Recipe Ingredients:** 
{{#each recipe.ingredients}}
- {{{this}}}
{{/each}}
*   **Total Servings Made:** {{{recipe.servings}}}
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
*   **Current Inventory:** {{{currentInventory}}}
*   **Unit System:** {{{unitSystem}}}

Based on this, determine the inventory changes, the leftover details for each destination, and the consumed macros.
If a location has 0 servings going to it, do not create an entry for it in the leftoverItems array.
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
