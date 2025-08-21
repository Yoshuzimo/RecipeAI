
/**
 * @fileoverview This file initializes the Genkit AI instance with necessary plugins.
 * It serves as the central point for AI configuration.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {firebase} from '@genkit-ai/firebase';


// Initialize Genkit with the Google AI plugin and Firebase plugins.
// This configuration will be used by all flows defined in the application.
export const ai = genkit({
  plugins: [
    googleAI({
      // The API version can be specified here. 'v1beta' is common for recent features.
      // apiVersion: 'v1beta',
    }),
    // Use the new, simplified Firebase plugin for Genkit v1.x
    firebase(),
  ],
  // This allows Genkit to store flow states in Firestore, which is useful for debugging
  // and monitoring production flows. This requires Firestore to be set up in your Firebase project.
  flowStateStore: 'firebase',

  // This enables tracing of AI flows, which can be viewed in a developer UI.
  // Traces can be exported to various services, including Google Cloud Trace.
  traceStore: 'firebase',
});
