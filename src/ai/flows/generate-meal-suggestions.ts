'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating meal suggestions based on user preferences, inventory, and expiring ingredients.
 *
 * - generateMealSuggestions - A function that takes user preferences and inventory data to suggest meals.
 * - GenerateMealSuggestionsInput - The input type for the generateMealSuggestions function.
 * - GenerateMealSuggestionsOutput - The return type for the generateMealSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMealSuggestionsInputSchema = z.object({
  cravingsOrMood: z
    .string()
    .describe('What the user is in the mood for (e.g., "something spicy", "a quick snack").'),
  currentInventory: z
    .string()
    .describe('A list of ingredients currently in the user\'s inventory, including quantities and expiration dates.'),
  expiringIngredients: z
    .string()
    .describe('A list of ingredients that are about to expire soon.'),
});
export type GenerateMealSuggestionsInput = z.infer<
  typeof GenerateMealSuggestionsInputSchema
>;

const GenerateMealSuggestionsOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of meal/snack suggestions based on the input data.'),
});

export type GenerateMealSuggestionsOutput = z.infer<
  typeof GenerateMealSuggestionsOutputSchema
>;

export async function generateMealSuggestions(
  input: GenerateMealSuggestionsInput
): Promise<GenerateMealSuggestionsOutput> {
  return generateMealSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMealSuggestionsPrompt',
  input: {schema: GenerateMealSuggestionsInputSchema},
  output: {schema: GenerateMealSuggestionsOutputSchema},
  prompt: `You are a meal planning assistant. Your task is to suggest 3-5 meal or snack options based on the user's cravings, current inventory, and ingredients that are about to expire.

User is in the mood for: {{{cravingsOrMood}}}
Current Inventory: {{{currentInventory}}}
Expiring Ingredients: {{{expiringIngredients}}}

Suggestions:`, // Ensure the AI returns only the suggestions.
});

const generateMealSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateMealSuggestionsFlow',
    inputSchema: GenerateMealSuggestionsInputSchema,
    outputSchema: GenerateMealSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
