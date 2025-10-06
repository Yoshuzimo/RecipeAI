
'use server';

import { ai } from '@/ai/genkit';
import { MealSuggestionOutputSchema, type MealSuggestionInput, type MealSuggestionOutput } from '@/ai/schemas/meal-suggestions';

export async function generateMealSuggestions(
  prompt: MealSuggestionInput
): Promise<MealSuggestionOutput> {
  try {
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt,
      config: { temperature: 0.8 },
      output: {
          schema: MealSuggestionOutputSchema,
      }
    });

    const output = llmResponse.output;

    if (!output) {
      return { error: "The AI returned an invalid response. Please try again." };
    }

    return output;
  } catch (e: any) {
    console.error("Error in generateMealSuggestions:", e);
    return { error: e.message || "Unknown AI error" };
  }
}
