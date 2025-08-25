
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { FinalizeRecipeResponseSchema, type FinalizeRecipeResponse } from '@/ai/schemas/finalize-recipe';

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
Based on the list of foods, calculate the estimated macros (calories, protein, carbs, total fat, fiber, and a breakdown of fat types) for the entire meal combined. The result should be for a single serving, representing the total of all foods eaten.

Provide the output in the following JSON format. Do not include any text outside of the main JSON object. The "servings" value should always be 1.

\`\`\`json
{
  "servings": 1,
  "macros": {
    "calories": <number>,
    "protein": <number>,
    "carbs": <number>,
    "fat": <number>,
    "fiber": <number>,
    "fats": {
      "saturated": <number>,
      "monounsaturated": <number>,
      "polyunsaturated": <number>,
      "trans": <number>
    }
  }
}
\`\`\`
`;

  try {
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt,
      config: { temperature: 0.3 },
    });

    const responseText = llmResponse.text;
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : responseText;
    
    const parsedJson = JSON.parse(jsonString);
    return FinalizeRecipeResponseSchema.parse(parsedJson);

  } catch (e: any) {
    console.error("Error in logManualMeal:", e);
    return { error: e.message || "Unknown AI error" };
  }
}
