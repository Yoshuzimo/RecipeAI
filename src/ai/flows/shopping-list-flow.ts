
'use server';
/**
 * @fileOverview This flow generates a personalized shopping list for the user based on their
 * inventory, preferences, and consumption habits.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {
    InventoryItemSchema,
    PersonalDetailsSchema,
} from '@/ai/schemas';

// Input schema for the shopping list flow
export const ShoppingListInputSchema = z.object({
  inventory: z.array(InventoryItemSchema),
  personalDetails: PersonalDetailsSchema,
  consumptionHistory: z.string().describe("A summary of the user's recent meal consumption."),
  unitSystem: z.enum(['us', 'metric']),
});
export type ShoppingListInput = z.infer<typeof ShoppingListInputSchema>;

// Output schema for the shopping list flow
export const ShoppingListOutputSchema = z.array(z.object({
    item: z.string(),
    quantity: z.string(),
    reason: z.string(),
}));
export type ShoppingListOutput = z.infer<typeof ShoppingListOutputSchema>;


// The main prompt for the flow
const shoppingListPrompt = ai.definePrompt({
    name: 'shoppingListPrompt',
    inputSchema: ShoppingListInputSchema,
    outputSchema: ShoppingListOutputSchema,
    prompt: `
        You are a smart shopping assistant. Your goal is to create a helpful and personalized shopping list for a user.

        Here is the information you have:
        - User's current inventory: {{#each inventory}}- {{name}} ({{totalQuantity}} {{unit}}) {{/each}}
        - User's personal details: {{JSONstringify personalDetails}}
        - User's consumption history: {{{consumptionHistory}}}
        - User's preferred unit system: {{{unitSystem}}}

        Your tasks:
        1.  **Analyze Inventory**: Identify items that are likely running low based on the user's consumption history and typical usage patterns.
        2.  **Consider Preferences**: Suggest new items or ingredients that align with the user's favorite foods and health goals. Avoid suggesting items that contain allergens or things the user dislikes.
        3.  **Provide Quantities and Reasons**: For each item you suggest, provide a reasonable quantity and a brief, helpful reason why it's on the list (e.g., "Running low," "For a healthy snack," "Pairs well with salmon").

        Generate a concise list of up to 10 shopping list items in the specified JSON format.
    `,
});

// The Genkit flow definition
const shoppingListFlow = ai.defineFlow(
  {
    name: 'shoppingListFlow',
    inputSchema: ShoppingListInputSchema,
    outputSchema: ShoppingListOutputSchema,
  },
  async (input) => {
    const response = await shoppingListPrompt.generate({input});
    return response.output()!;
  }
);

// The exported server action that calls the flow
export async function generateShoppingList(input: ShoppingListInput): Promise<ShoppingListOutput> {
  return shoppingListFlow(input);
}
