
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// This is the single source of truth for the Genkit configuration.
// It is imported by both the Next.js app (via flows) and the Genkit CLI (via dev.ts).
export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  model: 'googleai/gemini-2.0-flash',
});
