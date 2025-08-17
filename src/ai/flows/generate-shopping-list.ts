'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a shopping list based on user inventory, preferences, and consumption history.
 *
 * - generateShoppingList - A function that takes user data to generate shopping recommendations.
 * - GenerateShoppingListInput - The input type for the generateShoppingList function.
 * - GenerateShoppingListOutput - The return type for the generateShoppingList function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateShoppingListInputSchema = z.object({
  currentInventory: z
    .string()
    .describe(
      "A list of ingredients currently in the user's inventory, including quantities."
    ),
  personalDetails: z
    .string()
    .describe(
      'User-provided personal details, including health goals, dietary restrictions, allergies, and food preferences (likes/dislikes).'
    ),
  consumptionHistory: z
    .string()
    .describe(
      'A summary of what the user has consumed over the last month to understand their habits.'
    ),
});
export type GenerateShoppingListInput = z.infer<
  typeof GenerateShoppingListInputSchema
>;

const ShoppingListItemSchema = z.object({
  item: z.string().describe('The name of the shopping list item.'),
  quantity: z.string().describe('The suggested quantity to buy (e.g., "500g", "1 bottle", "2 lbs").'),
  reason: z.string().describe('A brief reason why this item is being suggested (e.g., "You are running low", "Pairs well with chicken").'),
});

const GenerateShoppingListOutputSchema = z.object({
  shoppingList: z
    .array(ShoppingListItemSchema)
    .describe('An array of recommended items to purchase.'),
});

export type GenerateShoppingListOutput = z.infer<
  typeof GenerateShoppingListOutputSchema
>;

export async function generateShoppingList(
  input: GenerateShoppingListInput
): Promise<GenerateShoppingListOutput> {
  return generateShoppingListFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateShoppingListPrompt',
  input: {schema: GenerateShoppingListInputSchema},
  output: {schema: GenerateShoppingListOutputSchema},
  prompt: `You are a shopping list assistant. Your task is to generate a shopping list based on the user's current inventory, personal details, and consumption history. 

Prioritize items that are running low or are essential for upcoming meals that align with the user's preferences. Suggest reasonable quantities.

User's Current Inventory:
{{{currentInventory}}}

User's Personal Details:
{{{personalDetails}}}

User's Consumption History (Last 30 Days):
{{{consumptionHistory}}}

Based on this, generate a shopping list.
`,
});

const generateShoppingListFlow = ai.defineFlow(
  {
    name: 'generateShoppingListFlow',
    inputSchema: GenerateShoppingListInputSchema,
    outputSchema: GenerateShoppingListOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
