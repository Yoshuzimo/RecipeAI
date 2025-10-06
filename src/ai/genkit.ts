'use server';

import { genkit } from 'genkit';
import { firebase } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/google-genai';

// This is the single, global Genkit instance for the application.
export const ai = genkit({
  plugins: [
    firebase, // The Firebase plugin handles security and authentication.
    googleAI({ apiVersion: 'v1' }), // The Google AI plugin, configured to use the stable 'v1' API.
  ],
  // These settings are for development and disable storing flow states and traces.
  flowStateStore: 'none',
  traceStore: 'none',
});
