

import { z } from 'zod';
import { MacrosSchema } from './shared';

export const FinalizeRecipeInputSchema = z.object({
    title: z.string(),
    ingredients: z.array(z.string()),
    instructions: z.array(z.string()),
});
export type FinalizeRecipeInput = z.infer<typeof FinalizeRecipeInputSchema>;

export const FinalizeRecipeOutputSchema = z.object({
    servings: z.number().int().positive(),
    macros: MacrosSchema,
});
export type FinalizeRecipeOutput = z.infer<typeof FinalizeRecipeOutputSchema>;

export const FinalizeRecipeResponseSchema = z.union([
  FinalizeRecipeOutputSchema,
  z.object({ error: z.string() })
]);
export type FinalizeRecipeResponse = z.infer<typeof FinalizeRecipeResponseSchema>;
