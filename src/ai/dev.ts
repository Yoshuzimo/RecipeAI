
import { config } from 'dotenv';
config();

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export default genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  model: 'googleai/gemini-2.0-flash',
});


import '@/ai/flows/generate-meal-suggestions.ts';
import '@/ai/flows/generate-shopping-list.ts';
import '@/ai/flows/generate-substitutions.ts';
import '@/ai/flows/log-cooked-meal.ts';
import '@/ai/flows/generate-recipe-details.ts';
