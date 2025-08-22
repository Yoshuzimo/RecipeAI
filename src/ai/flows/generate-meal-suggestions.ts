'use server';
/**
 * @fileOverview A meal suggestion AI flow.
 *
 * This file defines a Genkit 1.x flow for generating meal suggestions
 * based on a user's inventory and personal preferences.
 */

import { ai, defineFlow, generate } from '@/ai/genkit';
import { z } from 'zod';

export const MealSuggestionInputSchema = z.string();
export type MealSuggestionInput = z.infer<typeof MealSuggestionInputSchema>;

// The output can be a string (success) or an error object.
export const MealSuggestionOutputSchema = z.union([
  z.string(),
  z.object({ error: z.string() })
]);
export type MealSuggestionOutput = z.infer<typeof MealSuggestionOutputSchema>;

// Define flow using Genkit 1.16.1 syntax
const mealSuggestionFlow = defineFlow(
  {
    name: 'mealSuggestionFlow',
    inputSchema: MealSuggestionInputSchema,
    outputSchema: MealSuggestionOutputSchema,
  },
  async (prompt) => {
    try {
      const llmResponse = await generate({
        model: ai.model('googleai/gemini-1.5-flash'),
        prompt: prompt,
        config: {
          temperature: 0.8,
        },
      });

      return llmResponse.outputText();
    } catch (e: any) {
      console.error("Error in mealSuggestionFlow:", e);
      const errorMessage = e.message || "An unknown error occurred during AI generation.";
      return { error: `AI Generation Failed: ${errorMessage}` };
    }
  }
);

export async function generateMealSuggestions(
  prompt: MealSuggestionInput
): Promise<MealSuggestionOutput> {
  return await mealSuggestionFlow(prompt);
}
