
'use server';
/**
 * @fileOverview This flow handles the logic for logging a cooked meal.
 * It calculates the ingredients to be removed from inventory and the nutritional
 * information for the consumed portion of the meal.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
    InventoryItemSchema,
    RecipeSchema,
    LeftoverDestinationSchema,
    MacrosSchema,
} from '@/ai/schemas';

// Input schema for the Log Cooked Meal flow
export const LogMealInputSchema = z.object({
  recipe: RecipeSchema,
  inventory: z.array(InventoryItemSchema),
  servingsEaten: z.number().positive(),
  servingsEatenByOthers: z.number().min(0),
  fridgeLeftovers: z.array(LeftoverDestinationSchema),
  freezerLeftovers: z.array(LeftoverDestinationSchema),
  unitSystem: z.enum(['us', 'metric']),
});
export type LogMealInput = z.infer<typeof LogMealInputSchema>;

// Output schema for the Log Cooked Meal flow
export const LogMealOutputSchema = z.object({
  itemsToRemove: z.array(z.object({id: z.string()})).describe('Inventory items that have been fully consumed.'),
  itemsToUpdate: z.array(z.object({id: z.string(), newQuantity: z.number()})).describe('Inventory items that have been partially consumed, with their new quantities.'),
  leftoverItems: z.array(z.object({
      name: z.string(),
      totalQuantity: z.number(),
      originalQuantity: z.number(),
      unit: z.enum(['servings']),
      locationId: z.string(),
      expiryDate: z.date().nullable(),
      isPrivate: z.boolean(),
  })).describe('New items to be created in the inventory representing the leftovers.'),
  macrosConsumed: MacrosSchema.describe('The total macronutrients consumed by the user.'),
});
export type LogMealOutput = z.infer<typeof LogMealOutputSchema>;


// The main prompt for the flow
const logMealPrompt = ai.definePrompt({
    name: 'logMealPrompt',
    input: {schema: LogMealInputSchema},
    output: {schema: LogMealOutputSchema},
    prompt: `
        You are an expert kitchen inventory manager and nutritionist. Your task is to process a meal that has been cooked and consumed, and determine the impact on the user's inventory and their daily nutritional intake.

        Here is the information you have:
        - The recipe that was cooked: {{recipe.title}} (makes {{recipe.servings}} servings total)
        - Ingredients required for the recipe: {{#each recipe.ingredients}}- {{this}} {{/each}}
        - User's current inventory: {{#each inventory}}- {{name}} ({{totalQuantity}} {{unit}} available, expires on {{expiryDate}}) {{/each}}
        - Servings eaten by the user: {{servingsEaten}}
        - Servings eaten by others: {{servingsEatenByOthers}}
        - Leftovers to be stored in the fridge: {{#each fridgeLeftovers}}{{servings}} servings in location {{locationId}}{{/each}}
        - Leftovers to be stored in the freezer: {{#each freezerLeftovers}}{{servings}} servings in location {{locationId}}{{/each}}
        - User's preferred unit system: {{unitSystem}}

        Your tasks are:
        1.  **Calculate Ingredient Deduction**: Based on the recipe's ingredients and the total number of servings cooked (which is the entire recipe), determine which items from the inventory were used. You must match the ingredients from the recipe to the items in the inventory. For each matched ingredient, calculate how much was used.
            - Mark items that are fully consumed for removal.
            - Mark items that are partially consumed for update with their new quantity.
        2.  **Create Leftover Items**: For the servings designated as leftovers, create new items to be added to the inventory.
            - Fridge leftovers should have an expiry date 3 days from now.
            - Freezer leftovers should have an expiry date 90 days from now.
            - The quantity and unit for these leftover items should always be in "servings".
            - Leftovers should be marked as private to the user.
        3.  **Calculate Macros Consumed**: Based on the recipe's total macros and the number of servings the user ate, calculate the exact amount of protein, carbs, and fat the user consumed. Do not include servings eaten by others.

        Provide the output in the specified JSON format. Be precise in your calculations.
    `,
});

// The Genkit flow definition
const logMealFlow = ai.defineFlow(
  {
    name: 'logMealFlow',
    inputSchema: LogMealInputSchema,
    outputSchema: LogMealOutputSchema,
  },
  async (input) => {
    const {output} = await logMealPrompt(input);
    return output!;
  }
);

// The exported server action that calls the flow
export async function logCookedMeal(input: LogMealInput): Promise<LogMealOutput> {
  return logMealFlow(input);
}
