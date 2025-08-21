
'use server';
/**
 * @fileOverview This flow provides ingredient substitution suggestions for a given recipe.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
    InventoryItemSchema,
    PersonalDetailsSchema,
    RecipeSchema,
} from '@/ai/schemas';

// Input schema for the substitution flow
export const SubstitutionInputSchema = z.object({
  recipe: RecipeSchema,
  ingredientsToReplace: z.array(z.string()),
  inventory: z.array(InventoryItemSchema),
  personalDetails: PersonalDetailsSchema,
  allowExternalSuggestions: z.boolean().describe('Whether to allow suggestions for items not in the inventory.'),
  unitSystem: z.enum(['us', 'metric']),
});
export type SubstitutionInput = z.infer<typeof SubstitutionInputSchema>;

// Output schema for the substitution flow
export const SubstitutionOutputSchema = z.array(z.object({
    originalIngredient: z.string(),
    suggestedSubstitutions: z.array(z.object({
        name: z.string(),
        note: z.string().describe('Any notes on how to use the substitution, e.g., "use half the amount"'),
    })),
}));
export type SubstitutionOutput = z.infer<typeof SubstitutionOutputSchema>;


// The main prompt for the flow
const substitutionPrompt = ai.definePrompt({
    name: 'substitutionPrompt',
    input: {schema: SubstitutionInputSchema},
    output: {schema: SubstitutionOutputSchema},
    prompt: `
        You are a culinary expert with a deep knowledge of ingredient substitutions. A user needs help modifying a recipe.

        Here is the information you have:
        - The recipe: {{recipe.title}}
        - The user wants to replace: {{#each ingredientsToReplace}}- {{this}} {{/each}}
        - User's current inventory: {{#each inventory}}- {{name}} ({{totalQuantity}} {{unit}}) {{/each}}
        - User's personal details (for allergies/preferences): {{JSON.stringify personalDetails}}
        - Allow suggestions outside of inventory: {{allowExternalSuggestions}}
        - User's preferred unit system: {{unitSystem}}

        Your task is to provide 1-3 suitable substitutions for EACH of the requested ingredients.

        Follow these guidelines:
        1.  **Prioritize Inventory**: First, try to find substitutions from the user's existing inventory.
        2.  **Consider Context**: The substitution should make sense in the context of the recipe (e.g., don't suggest a sweet substitute for a savory dish).
        3.  **Respect Allergies**: Do NOT suggest any substitutes that conflict with the user's allergies or dietary restrictions.
        4.  **Provide Notes**: For each suggestion, provide a brief note explaining any necessary adjustments (e.g., "Use 1:1 ratio," "May change the texture slightly," "Reduce cooking time").
        5.  **External Suggestions**: {{#if allowExternalSuggestions}}If you can't find a good fit in the inventory, you can suggest common ingredients the user might be able to buy.{{/if}}

        Provide the output as an array of substitution objects in the specified JSON format.
    `,
});

// The Genkit flow definition
const substitutionFlow = ai.defineFlow(
  {
    name: 'substitutionFlow',
    inputSchema: SubstitutionInputSchema,
    outputSchema: SubstitutionOutputSchema,
  },
  async (input) => {
    const {output} = await substitutionPrompt(input);
    return output!;
  }
);

// The exported server action that calls the flow
export async function generateSubstitutions(input: SubstitutionInput): Promise<SubstitutionOutput> {
  return substitutionFlow(input);
}
