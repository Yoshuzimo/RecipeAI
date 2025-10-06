'use server';

import { ai } from '@/ai/genkit';
import {
  GenerateSubstitutionsInputSchema,
  GenerateSubstitutionsOutputSchema,
  GenerateSubstitutionsResponseSchema,
  type GenerateSubstitutionsInput,
  type GenerateSubstitutionsResponse,
} from '@/ai/schemas/substitutions';

export async function generateSubstitutions(
  input: GenerateSubstitutionsInput
): Promise<GenerateSubstitutionsResponse> {
  const prompt = `
You are an expert chef and nutritionist AI. Your task is to suggest 3-5 creative and suitable substitutions for a specific ingredient in a recipe.

**RECIPE DETAILS:**
*   **Title:** ${input.recipe.title}
*   **Description:** ${input.recipe.description}
*   **Original Ingredients:**
    ${input.recipe.ingredients.map(ing => `- ${ing}`).join('\n    ')}

**USER'S CONTEXT:**
*   **Inventory:**
    ${input.inventory.map(item => `- ${item.name}: ${item.totalQuantity.toFixed(2)} ${item.unit}`).join('\n    ')}
*   **Dietary Profile:**
    *   Health Goals: ${input.personalDetails.healthGoals || 'Not specified'}
    *   Dietary Restrictions: ${input.personalDetails.dietaryRestrictions || 'None'}
    *   Allergies: ${input.personalDetails.allergies || 'None'}

**YOUR TASK:**
Generate 3-5 suitable substitutions for the following ingredient: **"${input.ingredientToReplace}"**.

For each suggestion, provide:
1.  The name of the substitute ingredient.
2.  A brief note explaining any changes to the recipe (e.g., "Use half the amount," "May alter the texture slightly," "A great vegan alternative.").
3.  An estimation of how it changes the nutritional profile (e.g., "Adds more fiber," "Lower in fat," "Slightly higher in sugar.").

Provide the output in the specified JSON format.
`;

  try {
    const llmResponse = await ai.generate({
      model: 'gemini-pro',
      prompt,
      config: { temperature: 0.7 },
      output: {
          schema: GenerateSubstitutionsOutputSchema
      }
    });

    const aiOutput = llmResponse.output;

    if (!aiOutput) {
      return { error: "The AI returned an invalid response. Please try again." };
    }
    
    return GenerateSubstitutionsResponseSchema.parse(aiOutput);

  } catch (e: any) {
    console.error("Error in generateSubstitutions:", e);
    return { error: e.message || "Unknown AI error" };
  }
}