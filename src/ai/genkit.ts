/**
 * @fileoverview Initializes Genkit AI with Google AI and Firebase plugins.
 */

"use server";

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import firebase from "@genkit-ai/firebase"; // import as default

export const ai = genkit({
  plugins: [
    googleAI(),  // must call
    firebase(),  // must call
  ],
  flowStateStore: "none",
  traceStore: "none",
});
