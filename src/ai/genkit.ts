/**
 * @fileoverview Initializes Genkit AI with the Google AI plugin.
 */

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

// Ensure GEMINI_API_KEY is loaded
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in environment variables");
  throw new Error("GEMINI_API_KEY not found. Please add it to .env.local or Vercel env vars.");
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: "v1",
      apiKey: process.env.GEMINI_API_KEY, // ✅ Add API key here
    }),
  ],
  flowStateStore: "none",
  traceStore: "none",
});
