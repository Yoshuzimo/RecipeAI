
'use server';
/**
 * @fileOverview This flow generates detailed nutritional information and serving sizes
 * for a user-provided recipe.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {Recipe, RecipeSchema} from '@/ai/schemas';

// Input schema for generating recipe details
export const RecipeDetailsInputSchema = z.object({
  title: z.string().describe('The title of the recipe.'),
  description: z.string().optional().describe('A brief description of the recipe.'),
  ingredients: z.array(z.string()).describe('The list of ingredients.'),
  instructions: z.array(z.string()).describe('The cooking instructions.'),
});
export type RecipeDetailsInput = z.infer<typeof RecipeDetailsInputSchema>;

// The prompt for the flow
const recipeDetailsPrompt = ai.definePrompt({
    name: 'recipeDetailsPrompt',
    input: { schema: RecipeDetailsInputSchema },
    output: { schema: RecipeSchema },
    prompt: `
        You are a master chef and nutritionist. A user has provided a custom recipe and needs you to fill in the details.

        Recipe Title: {{{title}}}
        Description: {{{description}}}
        Ingredients:
        {{#each ingredients}}
        - {{this}}
        {{/each}}
        Instructions:
        {{#each instructions}}
        - {{this}}
        {{/each}}

        Your tasks are:
        1.  **Determine a reasonable number of servings** for this recipe.
        2.  **Calculate the estimated macronutrients** (protein, carbs, fat) for a single serving. Be as accurate as possible based on the ingredients list.
        3.  **Parse the ingredients** into a structured format, separating the name from the quantity and unit.

        Return the complete recipe object in the specified JSON format.
    `,
});

// The Genkit flow definition
const recipeDetailsFlow = ai.defineFlow(
  {
    name: 'recipeDetailsFlow',
    inputSchema: RecipeDetailsInputSchema,
    outputSchema: RecipeSchema,
  },
  async (input) => {
    const { output } = await recipeDetailsPrompt(input);
    return output!;
  }
);

// The exported server action that calls the flow
export async function generateRecipeDetails(input: RecipeDetailsInput): Promise<Recipe> {
  return recipeDetailsFlow(input);
}
