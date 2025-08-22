
'use server';
/**
 * @fileOverview This is the main flow for generating meal suggestions.
 * It takes user inventory, preferences, and mood into account to create
 * personalized recipe ideas.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {
    InventoryItemSchema,
    PersonalDetailsSchema,
    MacrosSchema,
    RecipeSchema
} from '@/ai/schemas';

// Input schema for the Suggestion Flow
export const SuggestionInputSchema = z.object({
  inventory: z.array(InventoryItemSchema),
  personalDetails: PersonalDetailsSchema,
  todaysMacros: MacrosSchema,
  cravingsOrMood: z.string().optional(),
  unitSystem: z.enum(['us', 'metric']),
});
export type SuggestionInput = z.infer<typeof SuggestionInputSchema>;

// Output schema for the Suggestion Flow
export const SuggestionOutputSchema = z.array(RecipeSchema);
export type SuggestionOutput = z.infer<typeof SuggestionOutputSchema>;

// The main prompt that drives the suggestion logic
const suggestionPrompt = ai.definePrompt({
  name: 'suggestionPrompt',
  input: { schema: SuggestionInputSchema },
  output: { schema: SuggestionOutputSchema },
  prompt: `
    You are a world-class chef and nutritionist who specializes in creating delicious, healthy, and practical meal plans.
    Your goal is to suggest 3-5 meal ideas based on the user's current inventory, personal preferences, and health goals.

    Here is the information you have about the user:
    - Current kitchen inventory: {{#each inventory}}- {{name}} ({{totalQuantity}} {{unit}} available, expires on {{expiryDate}}) {{/each}}
    - User's personal details (health goals, allergies, etc.): {{JSONstringify personalDetails}}
    - User's macros consumed so far today: {{{todaysMacros.protein}}}g protein, {{{todaysMacros.carbs}}}g carbs, {{{todaysMacros.fat}}}g fat.
    - User's current craving or mood: "{{cravingsOrMood}}"
    - User's preferred unit system for recipes: {{{unitSystem}}}

    Your task is to generate 3 to 5 creative and suitable meal suggestions. For each suggestion, provide a complete recipe.

    Follow these guidelines strictly:
    1.  **Prioritize Inventory Usage**: Create recipes that make good use of the items the user already has, especially those expiring soon.
    2.  **Respect Preferences**: Strictly adhere to all dietary restrictions and allergies. Incorporate favorite foods and avoid disliked ones.
    3.  **Align with Health Goals**: The recipes should align with the user's health goals. If the user wants to lose weight, suggest lower-calorie meals. If they want to build muscle, suggest higher-protein meals.
    4.  **Balance Macros**: Take into account the macros the user has already consumed today and suggest meals that help them meet their likely daily targets (assume a standard 2000-2500 calorie diet unless their goals suggest otherwise).
    5.  **Be Practical**: The recipes should be practical for a home cook. Don't suggest overly complex recipes unless the user's preferences indicate they enjoy a challenge.
    6.  **Complete Recipes**: For each suggestion, provide a full recipe including a title, description, serving size, a list of ingredients with quantities, step-by-step instructions, and calculated macros per serving.

    Return your response as an array of complete Recipe objects in the specified JSON format.
  `,
});

// The Genkit flow that orchestrates the suggestion process
const suggestionFlow = ai.defineFlow(
  {
    name: 'suggestionFlow',
    inputSchema: SuggestionInputSchema,
    outputSchema: SuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await suggestionPrompt(input);
    return output!;
  }
);

/**
 * The main server action that the client will call.
 * It takes the user's input, calls the Genkit flow, and returns the suggestions.
 * @param input The user's inventory, preferences, and mood.
 * @returns A promise that resolves to an array of recipe suggestions.
 */
export async function generateSuggestions(input: SuggestionInput): Promise<SuggestionOutput> {
  return suggestionFlow(input);
}
