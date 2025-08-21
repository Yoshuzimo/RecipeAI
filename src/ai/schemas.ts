
/**
 * @fileoverview This file contains the Zod schemas that define the data structures
 * used in the AI flows. These schemas are used for input validation and to ensure
 * the AI model returns data in the correct format.
 */
import {z} from 'genkit';

export const UnitSchema = z.enum(["g", "kg", "ml", "l", "pcs", "oz", "lbs", "fl oz", "gallon"]);

export const StorageLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['Fridge', 'Freezer', 'Pantry']),
});

export const InventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  originalQuantity: z.number(),
  totalQuantity: z.number(),
  unit: UnitSchema,
  expiryDate: z.date(),
  locationId: z.string(),
  isPrivate: z.boolean(),
});

export const PersonalDetailsSchema = z.object({
  healthGoals: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  allergies: z.string().optional(),
  favoriteFoods: z.string().optional(),
  dislikedFoods: z.string().optional(),
  healthConditions: z.string().optional(),
  medications: z.string().optional(),
  specializedEquipment: z.string().optional(),
});

export const MacrosSchema = z.object({
  protein: z.number().describe('Grams of protein.'),
  carbs: z.number().describe('Grams of carbohydrates.'),
  fat: z.number().describe('Grams of fat.'),
});

export const RecipeIngredientSchema = z.object({
    name: z.string(),
    notes: z.string().optional(),
});

export const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.number().positive(),
  ingredients: z.array(z.string()),
  parsedIngredients: z.array(RecipeIngredientSchema).optional(),
  instructions: z.array(z.string()),
  macros: MacrosSchema,
});

export const LeftoverDestinationSchema = z.object({
    locationId: z.string(),
    servings: z.number(),
});
