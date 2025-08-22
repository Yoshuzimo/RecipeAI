/**
 * @fileoverview Initializes Genkit AI with the Google AI plugin.
 */


import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

export const ai = genkit({
  plugins: [
    googleAI(),  // call the Google AI plugin
  ],
  flowStateStore: "none",
  traceStore: "none",
});
