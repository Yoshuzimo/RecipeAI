/**
 * @fileoverview Initializes Genkit AI with Google AI and Firebase plugins.
 */

"use server";

import * as genkitModule from "genkit";
import * as googleAIModule from "@genkit-ai/googleai";
import * as firebaseModule from "@genkit-ai/firebase";

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(),    // invoke the Firebase plugin
  ],
  flowStateStore: "none",
  traceStore: "none",
});
