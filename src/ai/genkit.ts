/**
 * @fileoverview Initializes Genkit AI with Google AI and Firebase plugins.
 */

"use server";

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
const firebase = (firebaseModule.default ?? firebaseModule) as () => any;

export const ai = genkit({
  plugins: [
    googleAI(),   // call this
    firebase(),     // do NOT call this
  ],
  flowStateStore: "none",
  traceStore: "none",
});
