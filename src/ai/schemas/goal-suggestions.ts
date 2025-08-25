
import { z } from 'zod';
import { PersonalDetailsSchema } from './shared';

export const ConversationEntrySchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
});

export const GenerateGoalSuggestionsInputSchema = z.object({
    personalDetails: PersonalDetailsSchema,
    history: z.array(ConversationEntrySchema),
});
export type GenerateGoalSuggestionsInput = z.infer<typeof GenerateGoalSuggestionsInputSchema>;


export const GoalRecommendationSchema = z.object({
    calories: z.number().int().positive(),
    protein: z.number().int().positive(),
    carbs: z.number().int().positive(),
    fat: z.number().int().positive(),
});
export type GoalRecommendation = z.infer<typeof GoalRecommendationSchema>;


const AISuggestionSchema = z.object({
  recommendation: GoalRecommendationSchema,
  reasoning: z.string(),
});

const AIQuestionSchema = z.object({
    question: z.string(),
});


export const GenerateGoalSuggestionsResponseSchema = z.union([
  AISuggestionSchema,
  AIQuestionSchema,
  z.object({ error: z.string() })
]);
export type GenerateGoalSuggestionsResponse = z.infer<typeof GenerateGoalSuggestionsResponseSchema>;
