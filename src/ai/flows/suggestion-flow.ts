
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  InventoryItem,
  PersonalDetails,
  Settings,
  DailyMacros,
  Recipe,
  Macros,
} from '@/lib/types';
import {
  format,
  differenceInDays
} from 'date-fns';

/**
 * @fileOverview Suggestion generation AI flows.
 *
 * - generateSuggestions - A function that handles the meal suggestion process.
 * - SuggestionRequest - The input type for the generateSuggestions function.
 */

// Schemas for data types to be used in prompts
const InventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  originalQuantity: z.number(),
  totalQuantity: z.number(),
  unit: z.enum(['g', 'kg', 'ml', 'l', 'pcs', 'oz', 'lbs', 'fl oz', 'gallon']),
  expiryDate: z.date().nullable(),
  locationId: z.string(),
  isPrivate: z.boolean(),
});

const PersonalDetailsSchema = z.object({
  healthGoals: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  allergies: z.string().optional(),
  favoriteFoods: z.string().optional(),
  dislikedFoods: z.string().optional(),
  healthConditions: z.string().optional(),
  medications: z.string().optional(),
  specializedEquipment: z.string().optional(),
});

const SettingsSchema = z.object({
  displayName: z.string(),
  unitSystem: z.enum(['us', 'metric']),
  subscriptionStatus: z.enum(['free', 'premium']),
  aiFeatures: z.boolean(),
  e2eEncryption: z.boolean(),
  expiryNotifications: z.boolean(),
  calorieGoal: z.number().optional(),
  proteinGoal: z.number().optional(),
  carbsGoal: z.number().optional(),
  fatGoal: z.number().optional(),
});

const MacrosSchema = z.object({
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

const DailyMacrosSchema = z.object({
  id: z.string(),
  meal: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
  dishes: z.array(z.object({ name: z.string(), protein: z.number(), carbs: z.number(), fat: z.number() })),
  totals: MacrosSchema,
  loggedAt: z.date(),
});

export const SuggestionRequestSchema = z.object({
  inventory: z.array(InventoryItemSchema),
  personalDetails: PersonalDetailsSchema,
  settings: SettingsSchema,
  todaysMacros: z.array(DailyMacrosSchema),
  cravings: z.string().optional(),
});
export type SuggestionRequest = z.infer < typeof SuggestionRequestSchema > ;

const RecipeIngredientSchema = z.object({
  name: z.string().describe("The name of the ingredient, e.g., 'chicken breast' or 'olive oil'."),
  notes: z.string().optional().describe("Additional notes, such as 'chopped', 'to taste', or 'about 1 cup'."),
});

const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.number().int(),
  ingredients: z.array(z.string()),
  parsedIngredients: z.array(RecipeIngredientSchema),
  instructions: z.array(z.string()),
  macros: MacrosSchema,
});

const SuggestionResponseSchema = z.array(RecipeSchema);
export type SuggestionResponse = z.infer < typeof SuggestionResponseSchema > ;

// Helper function to format inventory for the prompt
const formatInventory = (inventory: InventoryItem[]) => {
  const now = new Date();
  return inventory
    .filter(item => item.totalQuantity > 0)
    .map(item => {
      let expiryInfo = 'No expiry date';
      if (item.expiryDate) {
        const daysUntilExpiry = differenceInDays(item.expiryDate, now);
        if (daysUntilExpiry < 0) {
          expiryInfo = `Expired ${-daysUntilExpiry} days ago`;
        } else if (daysUntilExpiry === 0) {
          expiryInfo = 'Expires today';
        } else {
          expiryInfo = `Expires in ${daysUntilExpiry} days`;
        }
      }
      return `${item.name}: ${item.totalQuantity.toFixed(2)} ${item.unit} available. ${expiryInfo}.`;
    })
    .join('\n');
};

const formatTodaysMacros = (macros: DailyMacros[]) => {
  if (macros.length === 0) return "No meals logged yet today.";
  const totals = macros.reduce((acc, meal) => {
    acc.protein += meal.totals.protein;
    acc.carbs += meal.totals.carbs;
    acc.fat += meal.totals.fat;
    return acc;
  }, { protein: 0, carbs: 0, fat: 0 });

  return `So far today, the user has consumed:
- Protein: ${totals.protein.toFixed(1)}g
- Carbs: ${totals.carbs.toFixed(1)}g
- Fat: ${totals.fat.toFixed(1)}g
`;
};


const suggestionPrompt = ai.definePrompt({
  name: 'suggestionPrompt',
  input: {
    schema: SuggestionRequestSchema
  },
  output: {
    schema: SuggestionResponseSchema
  },
  prompt: `You are an expert chef and nutritionist AI named CookSmart. Your goal is to provide three varied, healthy, and appealing meal suggestions based on the user's available inventory, personal details, and preferences.

Analyze the user's situation:
- Today's Date: ${new Date().toDateString()}
- Current Inventory: A list of available food items and their expiry dates. Prioritize using items that are expiring soon.
- Personal Details: The user's health goals, dietary restrictions, allergies, and food preferences.
- Today's Macros: What the user has already eaten today, to help balance their diet.
- User's Cravings: Any specific requests the user has made.

Your task is to generate three distinct meal recipes. For each recipe, provide:
1.  A creative and appealing title.
2.  A short, enticing description (1-2 sentences).
3.  The number of servings the recipe makes.
4.  A list of ingredients with quantities.
5.  A list of step-by-step instructions.
6.  An approximate breakdown of macronutrients (protein, carbs, fat) per serving.

Key Instructions:
- **Prioritize Inventory**: Create recipes that primarily use ingredients the user already has, especially those nearing expiry.
- **Adhere to Preferences**: Strictly follow all dietary restrictions and allergies. Incorporate favorite foods and avoid disliked foods.
- **Balance Macros**: Suggest meals that align with the user's health goals and complement what they've already eaten today.
- **Be Realistic**: Provide standard, achievable recipes. The instructions should be clear and easy for a home cook to follow.
- **Variety is Key**: Offer a diverse range of meal types (e.g., a hearty main course, a light lunch, a quick snack) unless the user's craving suggests otherwise.

User's Context:
---
**Personal Details:**
- Health Goals: {{{personalDetails.healthGoals}}}
- Dietary Restrictions: {{{personalDetails.dietaryRestrictions}}}
- Allergies: {{{personalDetails.allergies}}}
- Favorite Foods: {{{personalDetails.favoriteFoods}}}
- Disliked Foods: {{{personalDetails.dislikedFoods}}}
- Health Conditions: {{{personalDetails.healthConditions}}}
- Medications: {{{personalDetails.medications}}}
- Specialized Equipment: {{{personalDetails.specializedEquipment}}}

**Unit System:** {{{settings.unitSystem}}}

**Today's Consumption:**
{{{formatTodaysMacros todaysMacros}}}

**Current Inventory:**
{{{formatInventory inventory}}}

**User's Request/Craving:**
"{{{cravings}}}"
---

Now, generate the three meal suggestions in the required format.`,
  helpers: {
    formatInventory,
    formatTodaysMacros
  },
});


const suggestionFlow = ai.defineFlow({
  name: 'suggestionFlow',
  inputSchema: SuggestionRequestSchema,
  outputSchema: SuggestionResponseSchema,
}, async (input) => {
  const {
    output
  } = await suggestionPrompt(input);
  return output || [];
});

export async function generateSuggestions(
  input: SuggestionRequest
): Promise < SuggestionResponse > {
  return await suggestionFlow(input);
}
