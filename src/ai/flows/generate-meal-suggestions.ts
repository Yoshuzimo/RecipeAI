
'use server';
/**
 * @fileoverview A flow that generates meal suggestions based on inventory and user preferences.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { PersonalDetails, Recipe, RecipeIngredient, Macros } from '@/lib/types';

// Zod schemas for input and output validation

const IngredientSchema = z.object({
  name: z.string().describe('The name of the ingredient, e.g., "Chicken Breast" or "Flour"'),
  notes: z.string().optional().describe('Any notes, e.g., "to taste" or "finely chopped"'),
});

const MacrosSchema = z.object({
  protein: z.number().describe('Grams of protein per serving.'),
  carbs: z.number().describe('Grams of carbohydrates per serving.'),
  fat: z.number().describe('Grams of fat per serving.'),
});

const RecipeSchema = z.object({
  title: z.string().describe('The title of the recipe.'),
  description: z.string().describe('A brief, enticing description of the recipe.'),
  servings: z.number().int().positive().describe('The number of servings the recipe makes.'),
  ingredients: z.array(z.string()).describe('List of ingredients with quantities, e.g., "1 cup of flour"'),
  parsedIngredients: z.array(IngredientSchema).describe('The parsed ingredients, separated into name and notes.'),
  instructions: z.array(z.string()).describe('The step-by-step instructions for preparing the meal.'),
  macros: MacrosSchema.describe('The nutritional information per serving.'),
});

export const GenerateMealSuggestionsInputSchema = z.object({
  cravingsOrMood: z.string().optional().describe('User\'s current cravings or mood, e.g., "spicy", "healthy", "comfort food"'),
  currentInventory: z.string().describe('A comma-separated list of items the user has in their inventory.'),
  expiringIngredients: z.string().describe('A comma-separated list of ingredients that are expiring soon.'),
  personalDetails: z.string().transform((val, ctx) => {
    try {
        return JSON.parse(val) as PersonalDetails;
    } catch (e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid personalDetails format" });
        return z.NEVER;
    }
  }).describe('A JSON string of the user\'s personal details, including dietary restrictions, allergies, and health goals.'),
  todaysMacros: z.custom<Macros>().describe('The total macros (protein, carbs, fat) the user has consumed today.'),
  recipeToAdjust: z.custom<Recipe>().optional().describe('An existing recipe that the user wants to adjust the serving size for.'),
  newServingSize: z.number().optional().describe('The desired new serving size if adjusting a recipe.'),
});

export const GenerateMealSuggestionsOutputSchema = z.object({
    suggestions: z.array(RecipeSchema).optional().describe("A list of 3-5 meal suggestions."),
    adjustedRecipe: RecipeSchema.optional().describe("The adjusted recipe with the new serving size, if applicable."),
    originalRecipeTitle: z.string().optional().describe("The original title of the recipe that was adjusted."),
});

export type GenerateMealSuggestionsInput = z.infer<typeof GenerateMealSuggestionsInputSchema>;
export type GenerateMealSuggestionsOutput = z.infer<typeof GenerateMealSuggestionsOutputSchema>;


const generateMealSuggestionsPrompt = ai.definePrompt({
    name: 'generateMealSuggestionsPrompt',
    input: { schema: GenerateMealSuggestionsInputSchema },
    output: { schema: GenerateMealSuggestionsOutputSchema },
    prompt: `
      You are a brilliant chef and nutritionist AI. Your task is to provide personalized meal suggestions.
      
      **User's Context:**
      - **Current Inventory:** {{{currentInventory}}}
      - **Expiring Soon:** {{{expiringIngredients}}} (Prioritize using these!)
      - **Personal Details (JSON):** {{{personalDetails}}}
      - **Today's Macros Consumed:** Protein: {{{todaysMacros.protein}}}g, Carbs: {{{todaysMacros.carbs}}}g, Fat: {{{todaysMacros.fat}}}g
      - **Cravings/Mood:** {{{cravingsOrMood}}}

      **Your Task:**
      
      {{#if recipeToAdjust}}
        **ADJUST RECIPE MODE:**
        The user wants to adjust the serving size of the following recipe.
        - **Original Recipe:** {{{recipeToAdjust.title}}}
        - **Original Servings:** {{{recipeToAdjust.servings}}}
        - **Original Ingredients:** {{{recipeToAdjust.ingredients}}}
        - **New Desired Servings:** {{{newServingSize}}}

        Your task is to:
        1.  Scale the ingredient quantities from the original servings to the new desired servings.
        2.  Do NOT change the macros per serving. The nutrition is fixed per serving.
        3.  Return the entire recipe object with the updated \`servings\` and \`ingredients\` list in the \`adjustedRecipe\` field. Also return the original recipe title in the \`originalRecipeTitle\` field.
      {{else}}
        **GENERATE SUGGESTIONS MODE:**
        Generate 3-5 creative and delicious meal suggestions based on the user's context.

        For each suggestion, provide a complete recipe object including:
        1.  **Title & Description:** Make it sound appealing.
        2.  **Servings:** A reasonable number of servings (e.g., 2-4).
        3.  **Ingredients:** A list of ingredients with estimated quantities. Be realistic about what the user might have. If an ingredient is not in their inventory, that's okay, but prioritize what they have.
        4.  **Parsed Ingredients:** For each ingredient, parse it into its name and any relevant notes (like "chopped" or "to taste").
        5.  **Instructions:** Clear, step-by-step cooking instructions.
        6.  **Macros:** An estimated breakdown of protein, carbs, and fat per serving. Consider the user's health goals and what they've already eaten today.
        
        Return the list of recipes in the \`suggestions\` field.
      {{/if}}
    `,
});


export const generateMealSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateMealSuggestionsFlow',
    inputSchema: GenerateMealSuggestionsInputSchema,
    outputSchema: GenerateMealSuggestionsOutputSchema,
  },
  async (input) => {
    const { output } = await generateMealSuggestionsPrompt(input);
    return output!;
  }
);

export async function generateMealSuggestions(input: GenerateMealSuggestionsInput): Promise<GenerateMealSuggestionsOutput> {
    return await generateMealSuggestionsFlow(input);
}
