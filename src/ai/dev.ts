
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { defineDotprompt } from 'genkit/tools';

import * as suggestionFlow from './flows/suggestion-flow.js';

const dotprompts = [
  defineDotprompt(suggestionFlow.suggestionPrompt)
];

export default genkit({
  plugins: [
    googleAI({
      apiVersion: ['v1', 'v1beta'],
      models: [{
        name: 'gemini-1.5-flash',
        path: 'gemini-1.5-flash-latest',
      }],
    }),
  ],
  prompts: [...dotprompts],
  flows: [suggestionFlow.suggestionFlow],
  logLevel: 'debug',
  enableTracing: true,
});
