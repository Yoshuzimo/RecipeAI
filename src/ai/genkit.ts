/**
 * @fileoverview Initializes Genkit AI with Google AI and Firebase plugins.
 */

"use server";

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import firebaseImport from "@genkit-ai/firebase";

// Ensure firebase is callable regardless of default export style
const firebase = (firebaseImport.default ?? firebaseImport) as () => any;

export const ai = genkit({
  plugins: [
    googleAI(),   // must call this
    firebase(),   // now safe to call
  ],
  flowStateStore: "none",
  traceStore: "none",
});
