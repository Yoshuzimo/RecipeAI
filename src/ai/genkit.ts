/**
 * @fileoverview Initializes Genkit AI with Google AI and Firebase plugins.
 * Tracing and flow state are disabled for cleaner builds on Vercel.
 */

"use server";

import { configureGenkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import { firebase } from "@genkit-ai/firebase"; 

export const ai = configureGenkit({
  plugins: [
    googleAI(),
    firebase(),    // invoke the Firebase plugin
  ],
  flowStateStore: "none",
  traceStore: "none",
  logLevel: "debug",
});
