
'use server';

import {genkit, Ai} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = new Ai({
  plugins: [
    googleAI({
      // Your API key is stored in the .env file.
      // See https://ai.google.dev/gemini-api/docs/api-key
    }),
  ],
  // Log developer-level information to the console.
  logLevel: 'debug',
  // Prevent telemetry data from being sent to Google.
  enableTelemetry: false,
});

    