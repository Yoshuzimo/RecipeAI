
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
  mealsEatenToday: z.array(z.string()).describe("A list of meals the user has already eaten today."),
   recipeToAdjust: z.object({
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
  }).optional().describe("An existing recipe to adjust for a new serving size."),
  newServingSize: z.number().optional().describe("The new number of servings to adjust the recipe for."),
});
export type GenerateMealSuggestionsInput = z.infer<
  typeof GenerateMealSuggestionsInputSchema
>;

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
  prompt: `You are a health-conscious meal planning assistant. 

{{#if recipeToAdjust}}
You are being asked to adjust an existing recipe for a new serving size.
**Original Recipe:**
Title: {{{recipeToAdjust.title}}}
Description: {{{recipeToAdjust.description}}}
Original Servings: {{{recipeToAdjust.servings}}}
Ingredients:
{{#each recipeToAdjust.ingredients}}
- {{{this}}}
{{/each}}
Instructions:
{{#each recipeToAdjust.instructions}}
- {{{this}}}
{{/each}}
**New Serving Size:** {{{newServingSize}}}

Please adjust the ingredient quantities for the new serving size. The instructions and macro estimates should remain the same. The title and description should also be the same. The servings field in the output should reflect the new serving size. You should only return this one adjusted recipe in the suggestions array.
{{else}}
Your task is to generate 3-5 complete meal or snack recipes based on the user's available inventory, personal details, and daily consumption.

**Key Priorities:**
1.  **Use Available & Expiring Ingredients:** Prioritize recipes that utilize ingredients from the user's inventory, especially those expiring soon.
2.  **Align with Health Goals:** The recipes must align with the user's health goals, dietary restrictions, and health conditions provided in their personal details.
3.  **Consider Daily Intake:** Account for the macros and meals the user has already consumed today to suggest nutritionally balanced options.
4.  **Format Correctly:** Provide all quantities and measurements in the user's preferred unit system: {{{unitSystem}}}.
5.  **Provide Serving Info**: For each recipe, provide the number of servings it makes and estimate the macronutrients *per serving*.

**User's Context:**
*   **Inventory:** {{{currentInventory}}}
*   **Expiring Soon:** {{{expiringIngredients}}}
*   **Personal Details (Sensitive - Use for Health-Aware Suggestions):** {{{personalDetails}}}
*   **Optional Cravings:** {{{cravingsOrMood}}}
*   **Macros Consumed Today:** Protein: {{{todaysMacros.protein}}}g, Carbs: {{{todaysMacros.carbs}}}g, Fat: {{{todaysMacros.fat}}}g
*   **Meals Eaten Today:** {{#each mealsEatenToday}}{{{this}}}{{/each}}

Based on all this information, please generate 3-5 detailed recipes. For each recipe, provide a title, a short description, the number of servings, a list of ingredients, step-by-step instructions, and estimated macros per serving.
{{/if}}
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
