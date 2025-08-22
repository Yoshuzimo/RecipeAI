
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

export const MealSuggestionOutputSchema = z.string();
export type MealSuggestionOutput = z.infer<typeof MealSuggestionOutputSchema>;


const mealSuggestionFlow = ai.defineFlow(
  {
    name: 'mealSuggestionFlow',
    inputSchema: MealSuggestionInputSchema,
    outputSchema: MealSuggestionOutputSchema,
  },
  async (prompt) => {
    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-1.5-flash',
      config: {
        temperature: 0.8,
      },
    });

    return llmResponse.text;
  }
);

export async function generateMealSuggestions(
  prompt: MealSuggestionInput
): Promise<MealSuggestionOutput> {
  return await mealSuggestionFlow(prompt);
}
