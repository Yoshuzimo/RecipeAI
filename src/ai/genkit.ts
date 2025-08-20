
import { genkit, Generation, ModelReference } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: ['v1', 'v1beta'],
    }),
  ],
  models: [{
    name: 'gemini-1.5-flash',
    path: 'gemini-1.5-flash-latest',
  }],
  logLevel: 'debug',
  enableTracing: true,
});
