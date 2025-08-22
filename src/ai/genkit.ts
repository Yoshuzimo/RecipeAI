/**
 * @fileoverview Initializes Genkit AI with Google AI and Firebase.
 * Supports optional OpenTelemetry tracing/logging.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import firebase from '@genkit-ai/firebase'; // ✅ default import for Genkit 1.x

// Optional: Import OpenTelemetry exporters if you want full tracing support.
// Install via: npm install @opentelemetry/winston-transport @opentelemetry/exporter-jaeger
// Uncomment if needed:
// import { NodeTracerProvider } from '@opentelemetry/sdk-node';
// import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
// import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';

export const ai = genkit({
  plugins: [
    googleAI({}),
    firebase, // ✅ works in 1.x
  ],
  flowStateStore: 'firebase',
  traceStore: 'firebase',
});
