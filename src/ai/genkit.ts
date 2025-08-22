
/**
 * @fileoverview Initializes Genkit AI with Google AI and Firebase plugins.
 * Tracing and flow state are disabled for cleaner builds on Vercel.
 */

"use server";

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import { firebase } from "@genkit-ai/firebase"; // named import

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(),    // invoke the Firebase plugin
  ],
  flowStateStore: null,  // no flow-state storage
  traceStore: null,      // tracing completely disabled
});
