
'use server';
/**
 * @fileOverview A meal suggestion AI flow.
 *
 * This file defines a Genkit flow for generating meal suggestions based on a user's
 * inventory and personal preferences.
 *
 * - generateMealSuggestions - A function that takes a detailed prompt and returns raw AI output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const MealSuggestionInputSchema = z.string();
export type MealSuggestionInput = z.infer<typeof MealSuggestionInputSchema>;

// The output can be a string (success) or an error object.
export const MealSuggestionOutputSchema = z.union([
    z.string(),
    z.object({ error: z.string() })
]);
export type MealSuggestionOutput = z.infer<typeof MealSuggestionOutputSchema>;


const mealSuggestionFlow = ai.defineFlow(
  {
    name: 'mealSuggestionFlow',
    inputSchema: MealSuggestionInputSchema,
    outputSchema: MealSuggestionOutputSchema,
  },
  async (prompt) => {
    try {
        const llmResponse = await ai.generate({
        prompt: prompt,
        model: 'googleai/gemini-1.5-flash',
        config: {
            temperature: 0.8,
        },
        });

        return llmResponse.text;
    } catch (e: any) {
        console.error("Error in mealSuggestionFlow:", e);
        // Provide a more detailed error message
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
