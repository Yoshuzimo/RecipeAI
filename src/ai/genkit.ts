/**
 * @fileoverview Initializes Genkit AI with Google AI and Firebase plugins.
 */

"use server";

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import firebase from "@genkit-ai/firebase";

export const ai = genkit({
  plugins: [
    googleAI(),   // call this
    firebase(),     // do NOT call this
  ],
  flowStateStore: "none",
  traceStore: "none",
});
