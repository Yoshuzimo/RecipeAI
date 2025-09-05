
'use server';

import { ai } from '@/ai/genkit';
import {
  FinalizeRecipeInputSchema,
  FinalizeRecipeResponseSchema,
  type FinalizeRecipeInput,
  type FinalizeRecipeResponse,
} from '@/ai/schemas/finalize-recipe';
import { MacrosSchema } from '@/ai/schemas/shared';
import { z } from 'zod';

const FullMacrosSchema = MacrosSchema.extend({
  servings: z.number().int().positive(),
});

const FinalizeRecipeAiOutputSchema = z.object({
  servings: z.number().int().positive().describe("The number of servings this recipe makes."),
  servingSize: z.string().describe("A human-readable description of a single serving size, e.g., '1 cup' or '2 tacos'."),
  macros: MacrosSchema,
});


export async function finalizeRecipe(
  input: FinalizeRecipeInput
): Promise<FinalizeRecipeResponse> {
  let partialMacrosPrompt = '';
  if (input.macros) {
    const provided = Object.entries(input.macros)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `*   ${key}: ${value}`)
      .join('\n    ');
    if (provided) {
      partialMacrosPrompt = `
**USER'S ESTIMATES (per serving):**
    *   The user has provided some estimates. Please verify them and use them as a reference. If they are significantly incorrect, provide the corrected values.
    ${provided}
`;
    }
  }

  const prompt = `
You are an expert chef and nutritionist AI. Your task is to analyze a recipe and determine a reasonable number of servings and calculate the nutritional information per serving.

**RECIPE DETAILS:**
*   **Title:** ${input.title}
*   **Ingredients:**
    ${input.ingredients.map(ing => `- ${ing}`).join('\n    ')}
*   **Instructions:**
    ${input.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n    ')}

${partialMacrosPrompt}

**YOUR TASK:**
Based on all the details, determine the following:
1.  A reasonable number of servings the recipe makes.
2.  A simple, human-readable description of a single serving (e.g., "1 cup", "250g", "2 tacos").
3.  The estimated macros (calories, protein, carbs, total fat, fiber, sugar, sodium, cholesterol, and a breakdown of fat types) per serving.

Provide the output in the following JSON format. Do not include any text outside of the main JSON object.

\`\`\`json
{
  "servings": <number_of_servings>,
  "servingSize": "<description_of_serving_size>",
  "macros": {
    "calories": <number>,
    "protein": <number>,
    "carbs": <number>,
    "fat": <number>,
    "fiber": <number>,
    "sugar": <number>,
    "sodium": <number>,
    "cholesterol": <number>,
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
      output: {
          schema: FinalizeRecipeAiOutputSchema,
      }
    });

    const aiOutput = llmResponse.output;

    if (!aiOutput) {
      return { error: "The AI returned an invalid response. Please try again." };
    }
    
    return FinalizeRecipeResponseSchema.parse(aiOutput);

  } catch (e: any) {
    console.error("Error in finalizeRecipe:", e);
    return { error: e.message || "Unknown AI error" };
  }
}
