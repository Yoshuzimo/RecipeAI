import { z } from 'zod';

export const MealSuggestionInputSchema = z.string();
export type MealSuggestionInput = z.infer<typeof MealSuggestionInputSchema>;

export const MealSuggestionOutputSchema = z.union([
  z.string(),
  z.object({ error: z.string() })
]);
export type MealSuggestionOutput = z.infer<typeof MealSuggestionOutputSchema>;
