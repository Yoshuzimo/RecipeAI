
import { z } from 'zod';

export const ShoppingSuggestionItemSchema = z.object({
  item: z.string().describe("The name of the grocery item to suggest."),
  quantity: z.string().describe("A suggested quantity to buy, e.g., '2 lbs' or '1 container'."),
  reason: z.string().describe("A brief, user-friendly reason for the suggestion."),
});

export const GenerateShoppingSuggestionsOutputSchema = z.object({
    suggestions: z.array(ShoppingSuggestionItemSchema),
});
export type GenerateShoppingSuggestionsOutput = z.infer<typeof GenerateShoppingSuggestionsOutputSchema>;


export const GenerateShoppingSuggestionsResponseSchema = z.union([
  GenerateShoppingSuggestionsOutputSchema,
  z.object({ error: z.string() })
]);
export type GenerateShoppingSuggestionsResponse = z.infer<typeof GenerateShoppingSuggestionsResponseSchema>;
