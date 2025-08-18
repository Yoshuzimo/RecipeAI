
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-meal-suggestions.ts';
import '@/ai/flows/generate-shopping-list.ts';
import '@/ai/flows/generate-substitutions.ts';
import '@/ai/flows/log-cooked-meal.ts';
import '@/ai/flows/generate-recipe-details.ts';
