
'use server';

import { ai } from '@/ai/genkit';
import {
  GenerateGoalSuggestionsInputSchema,
  GenerateGoalSuggestionsResponseSchema,
  type GenerateGoalSuggestionsInput,
  type GenerateGoalSuggestionsResponse,
} from '@/ai/schemas/goal-suggestions';

const systemPrompt = `
You are an expert nutritionist and fitness coach AI. Your task is to help a user determine their daily calorie and macronutrient goals (protein, carbs, fat, and fiber).

Your primary mode of operation is to be conversational. You will be given the user's personal details and the history of your conversation.

**Your Goal:**
Your ultimate goal is to provide a specific, actionable recommendation in the following JSON format:
{
  "recommendation": {
    "calories": <number>,
    "protein": <number>,
    "carbs": <number>,
    "fat": <number>,
    "fiber": <number>
  },
  "reasoning": "A brief explanation for why you are recommending these specific targets."
}

**Conversation Flow:**
1.  **Initial State:** You will first be called with only the user's personal details. Your first response should ALWAYS be to ask clarifying questions. Do NOT provide a recommendation on the first turn.
2.  **Ask Questions:** Analyze the provided details. If information is missing (e.g., activity level, age, sex, height, weight, specific nature of health goals), you MUST ask for it. Formulate your response as a question.
3.  **Iterate:** The user's answer will be added to the conversation history for the next turn. Continue this question-and-answer cycle until you have enough information to make a reasonably accurate recommendation.
4.  **Provide Recommendation:** Once you are confident you have the necessary details, provide the final JSON output with the "recommendation" and "reasoning" keys. Do not include any other text or formatting around the JSON object.

**Example Question Response:**
{
  "question": "Thank you for providing those details. To give you the best recommendation, could you please tell me your approximate age, height, weight, and your general activity level (e.g., sedentary, lightly active, moderately active, very active)?"
}

Do not make up information. If the user is vague, ask for more specific details. Your tone should be encouraging, helpful, and professional.
`;

export async function generateGoalSuggestions(
  input: GenerateGoalSuggestionsInput
): Promise<GenerateGoalSuggestionsResponse> {

  const composedPrompt = `
${systemPrompt}

**User's Personal Details:**
${JSON.stringify(input.personalDetails, null, 2)}

**Conversation History (User and Assistant):**
${input.history.map(entry => `${entry.role}: ${entry.content}`).join('\n')}
`;
  
  try {
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: composedPrompt,
      config: { temperature: 0.5 },
    });

    const responseText = llmResponse.text.trim();
    if (!responseText) {
      return { error: "The AI returned an empty response. Please try again." };
    }

    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = jsonMatch ? jsonMatch[1] : responseText;
    
    if (!jsonString.trim()) {
      return { error: "The AI returned an empty JSON response. Please try again." };
    }

    // Sometimes the model returns a valid JSON without the markdown block
    if (!jsonString.startsWith('{')) {
        jsonString = `{${jsonString.split('{').pop()}`;
    }
     if (!jsonString.endsWith('}')) {
        jsonString = `${jsonString.split('}').slice(0,-1).join('}')}}`;
    }

    const parsedJson = JSON.parse(jsonString);
    return GenerateGoalSuggestionsResponseSchema.parse(parsedJson);

  } catch (e: any) {
    console.error("Error in generateGoalSuggestions:", e);
    // Attempt to salvage a question if parsing fails
    if (typeof e.message === 'string' && e.message.includes("question")) {
        return { question: e.message };
    }
    return { error: e.message || "Unknown AI error" };
  }
}
