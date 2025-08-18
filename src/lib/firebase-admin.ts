
import * as admin from 'firebase-admin';

export function initFirebaseAdmin() {
  if (admin.apps.length) return;

  console.log("ADMIN: Initializing Firebase Admin SDK.");
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'development') {
      console.log('ADMIN: Emulator mode');
      process.env['FIREBASE_AUTH_EMULATOR_HOST'] = '127.0.0.1:9099';
      admin.initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project' });
      return;
    }
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY missing. Admin init failed.');
  }

  try {
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log("ADMIN: Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("ADMIN: Error parsing FIREBASE_SERVICE_ACCOUNT_KEY or initializing app:", error);
    throw new Error('Failed to initialize Firebase Admin SDK. Check service account key.');
  }
}

    