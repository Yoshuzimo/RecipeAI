
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
  }),
  currentInventory: z.string().describe("A comma-separated list of ingredients currently in the user's inventory, including quantities and expiration dates."),
  servingsEaten: z.number(),
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
  prompt: `You are an inventory management assistant for a recipe app. The user has just cooked a recipe. 

Your tasks are:
1.  **Deduct Ingredients**: Analyze the recipe's ingredients and determine which items need to be removed or have their quantities reduced from the user's current inventory. The output should only be the items that need to be changed.
2.  **Calculate Leftovers**: Calculate if there are any leftover servings based on the total servings in the recipe and the servings eaten.
3.  **Format Output**: Provide a list of inventory updates and a new leftover item if applicable.

**User's Context:**
*   **Recipe Cooked:** {{{recipe.title}}}
*   **Recipe Ingredients:** 
{{#each recipe.ingredients}}
- {{{this}}}
{{/each}}
*   **Total Servings Made:** {{{recipe.servings}}}
*   **Servings Eaten:** {{{servingsEaten}}}
*   **Current Inventory:** {{{currentInventory}}}
*   **Storage Method for Leftovers:** {{{storageMethod}}}
*   **Unit System:** {{{unitSystem}}}

Based on this, determine the inventory changes and the leftover details.
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
