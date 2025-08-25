

'use server';

import { ai } from '@/ai/genkit';
import {
  FinalizeRecipeInputSchema,
  FinalizeRecipeResponseSchema,
  type FinalizeRecipeInput,
  type FinalizeRecipeResponse,
} from '@/ai/schemas/finalize-recipe';

export async function finalizeRecipe(
  input: FinalizeRecipeInput
): Promise<FinalizeRecipeResponse> {
  const prompt = `
You are an expert chef and nutritionist AI. Your task is to analyze a recipe and determine a reasonable number of servings and calculate the nutritional information per serving.

**RECIPE DETAILS:**
*   **Title:** ${input.title}
*   **Ingredients:**
    ${input.ingredients.map(ing => `- ${ing}`).join('\n    ')}
*   **Instructions:**
    ${input.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n    ')}

**YOUR TASK:**
Based on the ingredients and instructions, determine the number of servings this recipe makes and calculate the estimated macros (calories, protein, carbs, total fat, fiber, and a breakdown of fat types) per serving.

Provide the output in the following JSON format. Do not include any text outside of the main JSON object.

\`\`\`json
{
  "servings": <number_of_servings>,
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
    console.error("Error in finalizeRecipe:", e);
    return { error: e.message || "Unknown AI error" };
  }
}
