/**
 * @fileoverview Initializes Genkit AI with Google AI and Firebase plugins.
 * Designed for Next.js 15 server-side usage.
 */

"use server"; // Ensures this file only runs on the server

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import { firebase } from "@genkit-ai/firebase"; // ✅ default export in Genkit 1.x

// Create the Genkit AI instance
export const ai = genkit({
  plugins: [
    googleAI(),
    firebase, // Firebase plugin as default export
  ],
  flowStateStore: "firebase",
  traceStore: "firebase",
});
