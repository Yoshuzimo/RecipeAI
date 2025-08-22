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

export async function generateMealSuggestions(
  prompt: MealSuggestionInput
): Promise<MealSuggestionOutput> {
  try {
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt,
      config: { temperature: 0.8 },
    });

    return llmResponse.text;
  } catch (e: any) {
    console.error("Error in generateMealSuggestions:", e);
    return { error: e.message || "Unknown AI error" };
  }
}
