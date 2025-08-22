'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const MealSuggestionInputSchema = z.string();
export type MealSuggestionInput = z.infer<typeof MealSuggestionInputSchema>;

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
        model: 'googleai/gemini-1.5-flash',
        prompt,
        config: { temperature: 0.8 },
      });

      return llmResponse.text; // correct for 1.16.1
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
