/**
 * @fileoverview Initializes Genkit AI with the Google AI plugin.
 */

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: "v1",
    }),
  ],
  flowStateStore: "none",
  traceStore: "none",
});
