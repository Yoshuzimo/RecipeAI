
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating ingredient substitutions for a recipe.
 *
 * - generateSubstitutions - A function that suggests substitutions for specified ingredients.
 * - GenerateSubstitutionsInput - The input type for the generateSubstitutions function.
 * - GenerateSubstitutionsOutput - The return type for the generateSubstitutions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecipeSchema = z.object({
    title: z.string(),
    description: z.string(),
    ingredients: z.array(z.string()),
    instructions: z.array(z.string()),
    macros: z.object({
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
    }),
    servings: z.number(),
});

const GenerateSubstitutionsInputSchema = z.object({
  recipe: RecipeSchema.describe("The recipe that needs substitutions."),
  ingredientsToReplace: z.array(z.string()).describe("A list of specific ingredient strings from the recipe to replace."),
  currentInventory: z.string().describe("A list of ingredients currently in the user's inventory."),
  personalDetails: z.string().describe("User's personal details (health goals, dietary restrictions, etc.)."),
  unitSystem: z.enum(["us", "metric"]).describe("The unit system the user prefers."),
});
export type GenerateSubstitutionsInput = z.infer<
  typeof GenerateSubstitutionsInputSchema
>;

const SubstitutionSuggestionSchema = z.object({
  originalIngredient: z.string().describe("The original ingredient that was to be replaced."),
  suggestedSubstitutions: z.array(z.string()).describe("A list of 1-3 suggested replacement ingredients with quantities."),
});

const GenerateSubstitutionsOutputSchema = z.object({
  substitutions: z.array(SubstitutionSuggestionSchema).describe("An array of substitution suggestions for each requested ingredient."),
});

export type GenerateSubstitutionsOutput = z.infer<
  typeof GenerateSubstitutionsOutputSchema
>;

export async function generateSubstitutions(
  input: GenerateSubstitutionsInput
): Promise<GenerateSubstitutionsOutput> {
  return generateSubstitutionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSubstitutionsPrompt',
  input: {schema: GenerateSubstitutionsInputSchema},
  output: {schema: GenerateSubstitutionsOutputSchema},
  prompt: `You are a culinary expert specializing in recipe adaptations. A user wants to make a recipe but needs to substitute some ingredients.

**Your Task:**
For each ingredient in the 'ingredientsToReplace' list, provide 1-3 suitable substitution suggestions. Consider the following:
1.  **Flavor Profile:** The substitution should complement the other ingredients in the recipe.
2.  **Function:** The substitution should serve a similar purpose (e.g., a fat for a fat, a leavening agent for a leavening agent).
3.  **User's Inventory:** If possible, suggest substitutions using items from the 'currentInventory'.
4.  **Health & Preferences:** The suggestions must align with the user's 'personalDetails' (dietary restrictions, allergies, etc.).
5.  **Recipe Context:** The substitution must make sense within the context of the full 'recipe'.
6.  **Quantities:** Provide appropriate quantities for each suggestion in the user's preferred 'unitSystem'.

**Recipe:**
Title: {{{recipe.title}}}
Ingredients:
{{#each recipe.ingredients}}
- {{{this}}}
{{/each}}
Instructions:
{{#each recipe.instructions}}
- {{{this}}}
{{/each}}

**User's Context:**
*   **Ingredients to Replace:** {{{ingredientsToReplace}}}
*   **Current Inventory:** {{{currentInventory}}}
*   **Personal Details (Sensitive):** {{{personalDetails}}}
*   **Unit System:** {{{unitSystem}}}

Based on this, generate a list of substitutions.
`,
});

const generateSubstitutionsFlow = ai.defineFlow(
  {
    name: 'generateSubstitutionsFlow',
    inputSchema: GenerateSubstitutionsInputSchema,
    outputSchema: GenerateSubstitutionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
