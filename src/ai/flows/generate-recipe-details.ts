
'use server';

/**
 * @fileOverview This file defines a Genkit flow for taking a user-created recipe and generating nutritional info and serving sizes.
 *
 * - generateRecipeDetails - A function that analyzes a recipe.
 * - GenerateRecipeDetailsInput - The input type for the function.
 * - GenerateRecipeDetailsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRecipeDetailsInputSchema = z.object({
    title: z.string(),
    description: z.string(),
    ingredients: z.array(z.string()),
    instructions: z.array(z.string()),
});
export type GenerateRecipeDetailsInput = z.infer<typeof GenerateRecipeDetailsInputSchema>;


const RecipeSchema = z.object({
    title: z.string().describe("The title of the recipe."),
    description: z.string().describe("A brief, enticing description of the recipe."),
    servings: z.number().describe("The number of servings this recipe makes."),
    ingredients: z.array(z.string()).describe("A list of ingredients required for the recipe."),
    instructions: z.array(z.string()).describe("Step-by-step instructions to prepare the meal."),
    macros: z.object({
        protein: z.number().describe("Estimated protein in grams per serving."),
        carbs: z.number().describe("Estimated carbohydrates in grams per serving."),
        fat: z.number().describe("Estimated fat in grams per serving."),
    }).describe("An estimate of the macronutrient content for a single serving of the recipe."),
});

const GenerateRecipeDetailsOutputSchema = z.object({
  recipe: RecipeSchema
});

export type GenerateRecipeDetailsOutput = z.infer<typeof GenerateRecipeDetailsOutputSchema>;


export async function generateRecipeDetails(
  input: GenerateRecipeDetailsInput
): Promise<GenerateRecipeDetailsOutput> {
  return generateRecipeDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRecipeDetailsPrompt',
  input: {schema: GenerateRecipeDetailsInputSchema},
  output: {schema: GenerateRecipeDetailsOutputSchema},
  prompt: `You are an expert recipe analyst. A user has provided the details of a recipe they created.

Your task is to analyze the ingredients and instructions to determine a reasonable number of servings this recipe would make, and then calculate the estimated macronutrients (protein, carbs, fat) *per serving*.

Return the complete recipe object, including the original title, description, ingredients, and instructions, but with your calculated 'servings' and 'macros' fields filled in.

**User's Recipe:**
*   **Title:** {{{title}}}
*   **Description:** {{{description}}}
*   **Ingredients:**
{{#each ingredients}}
- {{{this}}}
{{/each}}
*   **Instructions:**
{{#each instructions}}
- {{{this}}}
{{/each}}

Please analyze this and return the complete recipe object with your estimations for servings and macros per serving.
`,
});

const generateRecipeDetailsFlow = ai.defineFlow(
  {
    name: 'generateRecipeDetailsFlow',
    inputSchema: GenerateRecipeDetailsInputSchema,
    outputSchema: GenerateRecipeDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
