
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
  servingsEatenByOthers: z.number().describe("The number of servings eaten by others."),
  storageMethod: z.string().describe("Where the leftovers are stored (e.g., Fridge, Freezer)."),
  unitSystem: z.enum(["us", "metric"]),
});
export type LogCookedMealInput = z.infer<typeof LogCookedMealInputSchema>;


const LogCookedMealOutputSchema = z.object({
    updatedInventory: z.string().describe("The user's inventory after deducting the recipe ingredients. This should be a list of items to remove or update."),
    leftoverItem: z.object({
        name: z.string().describe("The name of the leftover item to be created."),
        quantity: z.number().describe("The number of servings remaining."),
    }).nullable().describe("The leftover item to be added to the inventory. Null if no servings are left."),
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
2.  **Calculate Leftovers**: Calculate if there are any leftover servings based on the total servings in the recipe and the total servings eaten (by user and by others).
3.  **Calculate Macros**: Calculate the total protein, carbs, and fat consumed **by the user only**. This is (servingsEaten * macros per serving).
4.  **Format Output**: Provide a list of inventory updates, a new leftover item if applicable, and the total macros consumed.

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
*   **Current Inventory:** {{{currentInventory}}}
*   **Storage Method for Leftovers:** {{{storageMethod}}}
*   **Unit System:** {{{unitSystem}}}

Based on this, determine the inventory changes, the leftover details, and the consumed macros.
The leftover item name should be "Leftover - {{{recipe.title}}}".
If there are no servings left, the leftoverItem should be null.
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
