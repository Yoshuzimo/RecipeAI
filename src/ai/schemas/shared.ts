

import { z } from 'zod';

export const DetailedFatsSchema = z.object({
    saturated: z.number().optional(),
    monounsaturated: z.number().optional(),
    polyunsaturated: z.number().optional(),
    trans: z.number().optional(),
});

export const MacrosSchema = z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    fiber: z.number().optional(),
    fats: DetailedFatsSchema.optional(),
    sodium: z.number().optional(),
    cholesterol: z.number().optional(),
    sugar: z.number().optional(),
});

export const RecipeSchema = z.object({
    title: z.string(),
    description: z.string(),
    servings: z.number().int().positive(),
    servingSize: z.string().optional(),
    ingredients: z.array(z.string()),
    instructions: z.array(z.string()),
    macros: MacrosSchema,
    isPrivate: z.boolean().optional(),
    ownerName: z.string().optional(),
});

export const InventoryItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    originalQuantity: z.number(),
    totalQuantity: z.number(),
    unit: z.enum(["g", "kg", "ml", "l", "pcs", "oz", "lbs", "fl oz", "gallon"]),
    expiryDate: z.date().nullable(),
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
