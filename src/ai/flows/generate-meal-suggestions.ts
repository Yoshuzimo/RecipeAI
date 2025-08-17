
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating meal suggestions based on user preferences, inventory, and expiring ingredients.
 *
 * - generateMealSuggestions - A function that takes user preferences and inventory data to suggest meals.
 * - GenerateMealSuggestionsInput - The input type for the generateMealSuggestions function.
 * - GenerateMealSuggestionsOutput - The return type for the generateMealSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMealSuggestionsInputSchema = z.object({
  cravingsOrMood: z
    .string().optional()
    .describe('What the user is in the mood for (e.g., "something spicy", "a quick snack"). This is optional.'),
  currentInventory: z
    .string()
    .describe('A list of ingredients currently in the user\'s inventory, including quantities and expiration dates.'),
  expiringIngredients: z
    .string()
    .describe('A list of ingredients that are about to expire soon.'),
  unitSystem: z.enum(["us", "metric"]).describe("The unit system the user prefers (us or metric)."),
  personalDetails: z.string().describe("User's personal details (health goals, dietary restrictions, etc.). This data is sensitive."),
  todaysMacros: z.object({
      protein: z.number(),
      carbs: z.number(),
      fat: z.number()
  }).describe("The user's total macronutrient consumption for today so far."),
  mealsEatenToday: z.array(z.string()).describe("A list of meals the user has already eaten today.")
});
export type GenerateMealSuggestionsInput = z.infer<
  typeof GenerateMealSuggestionsInputSchema
>;

const RecipeSchema = z.object({
    title: z.string().describe("The title of the recipe."),
    description: z.string().describe("A brief, enticing description of the recipe."),
    ingredients: z.array(z.string()).describe("A list of ingredients required for the recipe."),
    instructions: z.array(z.string()).describe("Step-by-step instructions to prepare the meal."),
    macros: z.object({
        protein: z.number().describe("Estimated protein in grams."),
        carbs: z.number().describe("Estimated carbohydrates in grams."),
        fat: z.number().describe("Estimated fat in grams."),
    }).describe("An estimate of the macronutrient content of the recipe."),
});

const GenerateMealSuggestionsOutputSchema = z.object({
  suggestions: z.array(RecipeSchema).describe('An array of 3-5 meal/snack recipes based on the input data.'),
});

export type GenerateMealSuggestionsOutput = z.infer<
  typeof GenerateMealSuggestionsOutputSchema
>;

export async function generateMealSuggestions(
  input: GenerateMealSuggestionsInput
): Promise<GenerateMealSuggestionsOutput> {
  return generateMealSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMealSuggestionsPrompt',
  input: {schema: GenerateMealSuggestionsInputSchema},
  output: {schema: GenerateMealSuggestionsOutputSchema},
  prompt: `You are a health-conscious meal planning assistant. Your task is to generate 3-5 complete meal or snack recipes based on the user's available inventory, personal details, and daily consumption.

**Key Priorities:**
1.  **Use Available & Expiring Ingredients:** Prioritize recipes that utilize ingredients from the user's inventory, especially those expiring soon.
2.  **Align with Health Goals:** The recipes must align with the user's health goals, dietary restrictions, and health conditions provided in their personal details.
3.  **Consider Daily Intake:** Account for the macros and meals the user has already consumed today to suggest nutritionally balanced options.
4.  **Format Correctly:** Provide all quantities and measurements in the user's preferred unit system: {{{unitSystem}}}.

**User's Context:**
*   **Inventory:** {{{currentInventory}}}
*   **Expiring Soon:** {{{expiringIngredients}}}
*   **Personal Details (Sensitive - Use for Health-Aware Suggestions):** {{{personalDetails}}}
*   **Optional Cravings:** {{{cravingsOrMood}}}
*   **Macros Consumed Today:** Protein: {{{todaysMacros.protein}}}g, Carbs: {{{todaysMacros.carbs}}}g, Fat: {{{todaysMacros.fat}}}g
*   **Meals Eaten Today:** {{#each mealsEatenToday}}{{{this}}}{{/each}}

Based on all this information, please generate 3-5 detailed recipes. For each recipe, provide a title, a short description, a list of ingredients, step-by-step instructions, and estimated macros.
`,
});

const generateMealSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateMealSuggestionsFlow',
    inputSchema: GenerateMealSuggestionsInputSchema,
    outputSchema: GenerateMealSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
