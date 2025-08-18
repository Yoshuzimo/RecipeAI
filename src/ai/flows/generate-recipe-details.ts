
'use server';
/**
 * @fileoverview A flow that takes a user-created recipe and enriches it with servings and nutritional info.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Recipe } from '@/lib/types';

const IngredientSchema = z.object({
  name: z.string().describe('The name of the ingredient, e.g., "Chicken Breast" or "Flour"'),
  notes: z.string().optional().describe('Any notes, e.g., "to taste" or "finely chopped"'),
});

const MacrosSchema = z.object({
  protein: z.number().describe('Grams of protein per serving.'),
  carbs: z.number().describe('Grams of carbohydrates per serving.'),
  fat: z.number().describe('Grams of fat per serving.'),
});

export const GenerateRecipeDetailsInputSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    ingredients: z.array(z.string()),
    instructions: z.array(z.string()),
});

export const GenerateRecipeDetailsOutputSchema = z.object({
    servings: z.number().int().positive().describe('A reasonable estimate for the number of servings this recipe makes.'),
    macros: MacrosSchema.describe('An estimated nutritional breakdown per serving.'),
    parsedIngredients: z.array(IngredientSchema).describe('The ingredients, parsed into names and notes.'),
});

export type GenerateRecipeDetailsInput = z.infer<typeof GenerateRecipeDetailsInputSchema>;
export type GenerateRecipeDetailsOutput = z.infer<typeof GenerateRecipeDetailsOutputSchema>;

const generateRecipeDetailsPrompt = ai.definePrompt({
    name: 'generateRecipeDetailsPrompt',
    input: { schema: GenerateRecipeDetailsInputSchema },
    output: { schema: GenerateRecipeDetailsOutputSchema },
    prompt: `
        You are a recipe analysis AI. A user has provided a custom recipe. 
        Your task is to analyze the ingredients and instructions to estimate the number of servings it makes and its nutritional content (macros) per serving.
        Also, parse the ingredients list into a structured format.

        **User's Recipe:**
        - **Title:** {{{title}}}
        - **Description:** {{{description}}}
        - **Ingredients:** {{{ingredients}}}
        - **Instructions:** {{{instructions}}}

        **Instructions:**
        1.  Read the ingredients and instructions carefully.
        2.  Based on the quantities and type of ingredients, estimate a reasonable number of servings this recipe would create.
        3.  Calculate the estimated macros (protein, carbs, fat) for a single serving.
        4.  Parse each ingredient string into a name and optional notes (e.g., for "1 cup flour, sifted", the name is "flour" and notes are "sifted").
        5.  Return ONLY the servings, macros, and parsedIngredients in the specified JSON format.
    `,
});


export const generateRecipeDetailsFlow = ai.defineFlow(
  {
    name: 'generateRecipeDetailsFlow',
    inputSchema: GenerateRecipeDetailsInputSchema,
    outputSchema: GenerateRecipeDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await generateRecipeDetailsPrompt(input);
    return output!;
  }
);

export async function generateRecipeDetails(input: GenerateRecipeDetailsInput): Promise<Recipe> {
    const details = await generateRecipeDetailsFlow(input);
    return { ...input, ...details };
}
