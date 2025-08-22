'use server';

import { ai } from '@/ai/genkit';
import type { MealSuggestionInput, MealSuggestionOutput } from '@/ai/schemas/meal-suggestions';

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
