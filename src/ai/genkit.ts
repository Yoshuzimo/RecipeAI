/**
 * @fileoverview This file initializes the Genkit AI instance with necessary plugins.
 * It serves as the central point for AI configuration.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';

// Initialize Genkit with the Google AI plugin and Firebase plugin.
// This configuration will be used by all flows defined in the application.
export const ai = genkit({
  plugins: [
    googleAI({
      // apiVersion: 'v1beta', // optional
    }),
    firebase, // ✅ use as a plugin object, no ()
  ],
  flowStateStore: 'firebase',
  traceStore: 'firebase',
});
