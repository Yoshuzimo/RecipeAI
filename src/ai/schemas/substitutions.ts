
import { z } from 'zod';
import { RecipeSchema, InventoryItemSchema, PersonalDetailsSchema } from './shared';

export const GenerateSubstitutionsInputSchema = z.object({
    recipe: RecipeSchema,
    ingredientToReplace: z.string(),
    inventory: z.array(InventoryItemSchema),
    personalDetails: PersonalDetailsSchema,
});
export type GenerateSubstitutionsInput = z.infer<typeof GenerateSubstitutionsInputSchema>;

export const AISuggestionSchema = z.object({
  name: z.string(),
  note: z.string(),
});

export const GenerateSubstitutionsOutputSchema = z.object({
    originalIngredient: z.string(),
    suggestedSubstitutions: z.array(AISuggestionSchema),
});
export type GenerateSubstitutionsOutput = z.infer<typeof GenerateSubstitutionsOutputSchema>;

export const GenerateSubstitutionsResponseSchema = z.union([
  GenerateSubstitutionsOutputSchema,
  z.object({ error: z.string() })
]);
export type GenerateSubstitutionsResponse = z.infer<typeof GenerateSubstitutionsResponseSchema>;
