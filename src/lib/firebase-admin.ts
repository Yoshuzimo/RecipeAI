
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: admin.app.App | undefined;

function initializeAdminApp() {
  if (process.env.NODE_ENV === 'development') {
    // In development, use the emulator
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] = '127.0.0.1:9099';
    process.env['FIRESTORE_EMULATOR_HOST'] = '127.0.0.1:8080';
    return admin.initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project' });
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawServiceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Admin initialization failed.');
  }

  try {
    const serviceAccount = JSON.parse(rawServiceAccount);
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (error) {
    console.error("ADMIN: Error parsing FIREBASE_SERVICE_ACCOUNT_KEY or initializing app:", error);
    throw new Error('Failed to initialize Firebase Admin SDK. Check service account key.');
  }
}

export function initFirebaseAdmin() {
  if (!admin.apps.length) {
    adminApp = initializeAdminApp();
  }
  return adminApp!;
}

export const adminDb = getFirestore(initFirebaseAdmin());
