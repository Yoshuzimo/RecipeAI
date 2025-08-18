
'use server';
/**
 * @fileoverview A flow that generates a personalized shopping list.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { PersonalDetails, InventoryItem } from '@/lib/types';


const AIListItemSchema = z.object({
    item: z.string().describe("The name of the shopping list item."),
    quantity: z.string().describe("A suggested quantity to buy, e.g., '1 lb' or '2 cans'."),
    reason: z.string().describe("A brief reason why this item is being suggested."),
});

export const GenerateShoppingListInputSchema = z.object({
  inventory: z.string().describe("The user's current inventory as a JSON string."),
  personalDetails: z.string().describe("The user's personal details as a JSON string."),
});

export const GenerateShoppingListOutputSchema = z.object({
    shoppingList: z.array(AIListItemSchema).describe("The generated shopping list."),
});

export type GenerateShoppingListInput = z.infer<typeof GenerateShoppingListInputSchema>;
export type GenerateShoppingListOutput = z.infer<typeof GenerateShoppingListOutputSchema>;

const generateShoppingListPrompt = ai.definePrompt({
    name: 'generateShoppingListPrompt',
    input: { schema: GenerateShoppingListInputSchema },
    output: { schema: GenerateShoppingListOutputSchema },
    prompt: `
      You are a smart shopping assistant. Your goal is to create a helpful, personalized shopping list for the user based on their inventory and personal preferences.

      **User's Context:**
      - **Current Inventory:** {{{inventory}}}
      - **Personal Details:** {{{personalDetails}}}

      **Your Task:**
      1.  Analyze the user's inventory. Don't suggest items they already have plenty of unless it's a staple.
      2.  Consider their personal details (likes, dislikes, health goals, allergies) to suggest relevant items.
      3.  Suggest 5-7 items that would complement their current inventory and help them create new meals.
      4.  For each item, provide a suggested quantity and a brief, helpful reason for the suggestion. For example, "Tomatoes" - "1 lb" - "To go with the pasta and ground beef in your pantry."
      5.  Return the list of items in the specified JSON format.
    `,
});

export const generateShoppingListFlow = ai.defineFlow(
  {
    name: 'generateShoppingListFlow',
    inputSchema: GenerateShoppingListInputSchema,
    outputSchema: GenerateShoppingListOutputSchema,
  },
  async (input) => {
    const parsedInput = {
      ...input,
      inventory: JSON.parse(input.inventory) as InventoryItem[],
      personalDetails: JSON.parse(input.personalDetails) as PersonalDetails,
    };
    const { output } = await generateShoppingListPrompt(parsedInput);
    return output!;
  }
);

export async function generateShoppingList(input: GenerateShoppingListInput): Promise<GenerateShoppingListOutput> {
    return await generateShoppingListFlow(input);
}
