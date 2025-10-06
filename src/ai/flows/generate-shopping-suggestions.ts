
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GenerateShoppingSuggestionsOutputSchema, type GenerateShoppingSuggestionsResponse } from '@/ai/schemas/shopping-suggestions';

const ShoppingSuggestionInputSchema = z.object({
  inventory: z.string(),
  personalDetails: z.string(),
  consumptionHistory: z.string(),
});

type ShoppingSuggestionInput = z.infer<typeof ShoppingSuggestionInputSchema>;

export async function generateShoppingSuggestions(
  input: ShoppingSuggestionInput
): Promise<GenerateShoppingSuggestionsResponse> {
  const prompt = `
You are an expert shopping assistant and meal planner AI. Your task is to generate a list of 5-7 smart and personalized grocery shopping suggestions for the user.

**USER'S CONTEXT:**

*   **Current Inventory:**
    ${input.inventory}

*   **Personal Details (Health, Diet, Preferences):**
    ${input.personalDetails}
    
*   **Recent Consumption History:**
    ${input.consumptionHistory}

**YOUR TASK:**
Based on the user's inventory, preferences, and recent meals, generate a list of 5-7 grocery items they might want to buy.

For each suggestion, provide:
1.  **item**: The name of the grocery item.
2.  **quantity**: A reasonable quantity to purchase (e.g., "1 lb", "2 containers", "a bunch").
3.  **reason**: A short, helpful reason why you're suggesting this item (e.g., "Pairs well with the chicken you have," "You're running low and use it often," "To complement your health goals.").

Provide the output in the specified JSON format.
`;

  try {
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-pro',
      prompt,
      config: { temperature: 0.9 },
      output: {
          schema: GenerateShoppingSuggestionsOutputSchema,
      }
    });

    const aiOutput = llmResponse.output;

    if (!aiOutput) {
      return { error: "The AI returned an invalid response. Please try again." };
    }
    
    return GenerateShoppingSuggestionsOutputSchema.parse(aiOutput);

  } catch (e: any) {
    console.error("Error in generateShoppingSuggestions:", e);
    return { error: e.message || "Unknown AI error" };
  }
}
