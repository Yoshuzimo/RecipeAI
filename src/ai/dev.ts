
import { config } from 'dotenv';
config();

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// This file is the entry point for the Genkit development server.
// It is not part of the Next.js application bundle.
// Flows are now registered within their own files and are not imported here.

export default genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  model: 'googleai/gemini-2.0-flash',
});
