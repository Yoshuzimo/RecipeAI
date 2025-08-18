
'use server';
/**
 * @fileoverview A flow that suggests ingredient substitutions for a recipe.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { InventoryItem, PersonalDetails, Recipe } from '@/lib/types';


const SuggestionSchema = z.object({
    name: z.string().describe("The name of the suggested substitute ingredient, including quantity."),
    note: z.string().describe("A brief note explaining the substitution, e.g., 'This will change the texture slightly.' or 'A great vegan alternative.'"),
});

export const SubstitutionSuggestionSchema = z.object({
    originalIngredient: z.string().describe("The original ingredient that is being replaced."),
    suggestedSubstitutions: z.array(SuggestionSchema).describe("A list of up to 3 suggested substitutions."),
});

export const GenerateSubstitutionsInputSchema = z.object({
  recipe: z.custom<Recipe>().describe("The full recipe object."),
  ingredientsToReplace: z.array(z.string()).describe("A list of the specific ingredient strings the user wants to replace."),
  inventory: z.string().transform((val, ctx) => {
    try {
      return JSON.parse(val) as InventoryItem[];
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid inventory format" });
      return z.NEVER;
    }
  }).describe("The user's current inventory as a JSON string."),
  allowExternalSuggestions: z.boolean().describe("Whether to allow suggestions for items not currently in the user's inventory."),
  personalDetails: z.string().transform((val, ctx) => {
    try {
        return JSON.parse(val) as PersonalDetails;
    } catch (e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid personalDetails format" });
        return z.NEVER;
    }
  }).describe("The user's personal details as a JSON string."),
});

export const GenerateSubstitutionsOutputSchema = z.object({
    substitutions: z.array(SubstitutionSuggestionSchema),
});


export type GenerateSubstitutionsInput = z.infer<typeof GenerateSubstitutionsInputSchema>;
export type GenerateSubstitutionsOutput = z.infer<typeof GenerateSubstitutionsOutputSchema>;


const generateSubstitutionsPrompt = ai.definePrompt({
    name: 'generateSubstitutionsPrompt',
    input: { schema: GenerateSubstitutionsInputSchema },
    output: { schema: GenerateSubstitutionsOutputSchema },
    prompt: `
        You are an expert recipe improviser. A user wants to make a recipe but needs to substitute some ingredients.

        **Recipe Title:** {{{recipe.title}}}
        
        **Ingredients to Replace:**
        {{#each ingredientsToReplace}}
        - {{{this}}}
        {{/each}}

        **Context:**
        - **User's Inventory:** {{{inventory}}}
        - **User's Preferences:** {{{personalDetails}}}
        - **Allow suggesting items not in inventory:** {{{allowExternalSuggestions}}}

        **Your Task:**
        For each ingredient in the "Ingredients to Replace" list, provide up to 3 suitable substitutions.
        
        For each substitution, provide:
        1.  \`name\`: The name and quantity of the substitute ingredient (e.g., "1/2 cup of almond milk").
        2.  \`note\`: A brief, helpful note about the substitution. This could be about flavor changes, why it's a good choice, or if it meets a dietary need (e.g., "A great dairy-free option.").

        **Priorities:**
        1.  First, try to suggest items the user already has in their inventory.
        2.  If \`allowExternalSuggestions\` is true, you can suggest common pantry items they might not have listed.
        3.  Consider the user's dietary restrictions and allergies from their personal details.
        4.  If you cannot find a suitable substitute for an ingredient, return an empty list for its \`suggestedSubstitutions\`.
    `,
});

export const generateSubstitutionsFlow = ai.defineFlow(
  {
    name: 'generateSubstitutionsFlow',
    inputSchema: GenerateSubstitutionsInputSchema,
    outputSchema: GenerateSubstitutionsOutputSchema,
  },
  async (input) => {
    const { output } = await generateSubstitutionsPrompt(input);
    return output!;
  }
);


export async function generateSubstitutions(input: GenerateSubstitutionsInput): Promise<GenerateSubstitutionsOutput> {
    return await generateSubstitutionsFlow(input);
}
