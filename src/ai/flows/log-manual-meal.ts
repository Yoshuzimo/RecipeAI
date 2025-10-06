
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { FinalizeRecipeResponseSchema, FinalizeRecipeOutputSchema, type FinalizeRecipeResponse } from '@/ai/schemas/finalize-recipe';

const foodItemSchema = z.object({
    quantity: z.string(),
    unit: z.string(),
    name: z.string(),
});

const LogManualMealInputSchema = z.object({
    foods: z.array(foodItemSchema),
});
export type LogManualMealInput = z.infer<typeof LogManualMealInputSchema>;


export async function logManualMeal(
  input: LogManualMealInput
): Promise<FinalizeRecipeResponse> {
  const prompt = `
You are an expert nutritionist AI. Your task is to analyze a list of foods that a user has eaten for a meal and calculate the estimated total nutritional information for the entire meal.

**FOODS EATEN:**
${input.foods.map(food => `- ${food.quantity} ${food.unit} ${food.name}`).join('\n')}

**YOUR TASK:**
Based on the list of foods, calculate the estimated macros (calories, protein, carbs, total fat, fiber, sugar, sodium, cholesterol, and a breakdown of fat types) for the entire meal combined. The result should be for a single serving, representing the total of all foods eaten.

The "servings" value in your output should always be 1. Provide the output in the specified JSON format.
`;

  try {
    const llmResponse = await ai.generate({
      model: 'gemini-pro',
      prompt,
      config: { temperature: 0.3 },
      output: {
          schema: FinalizeRecipeOutputSchema
      }
    });

    const aiOutput = llmResponse.output;
    if (!aiOutput) {
      return { error: "The AI returned an empty response. Please try again." };
    }
    
    return FinalizeRecipeResponseSchema.parse(aiOutput);

  } catch (e: any