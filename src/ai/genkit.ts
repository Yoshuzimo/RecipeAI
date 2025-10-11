/**
 * @fileoverview Initializes Genkit AI with the Google AI plugin.
 */

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: "v1",
      models: {
        "gemini-pro": "models/gemini-1.5-pro-latest", // ✅ register alias + model
        "models/gemini-1.5-pro-latest": "models/gemini-1.5-pro-latest", // ✅ also expose direct name
      },
    }),
  ],
  flowStateStore: "none",
  traceStore: "none",
});
