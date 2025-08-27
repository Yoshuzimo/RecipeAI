
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

Provide the output in the following JSON format. Do not include any text outside of the main JSON object.

\`\`\`json
{
  "suggestions": [
    {
      "item": "Avocado",
      "quantity": "2-3",
      "reason": "You have tomatoes and onions, perfect for guacamole or to add to salads."
    },
    {
      "item": "Brown Rice",
      "quantity": "1 bag",
      "reason": "A healthy grain that pairs well with the chicken and beef in your inventory."
    }
  ]
}
\`\`\`
`;

  try {
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt,
      config: { temperature: 0.9 },
    });

    const responseText = llmResponse.text;
     if (!responseText) {
      return { error: "The AI returned an empty response. Please try again." };
    }

    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : responseText;
    
    if (!jsonString.trim()) {
        return { error: "The AI returned an empty JSON response. Please try again." };
    }
    
    const parsedJson = JSON.parse(jsonString);
    return GenerateShoppingSuggestionsOutputSchema.parse(parsedJson);

  } catch (e: any) {
    console.error("Error in generateShoppingSuggestions:", e);
    return { error: e.message || "Unknown AI error" };
  }
}
