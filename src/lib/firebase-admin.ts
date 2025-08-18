
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

let db: admin.firestore.Firestore;

export function initFirebaseAdmin() {
  if (admin.apps.length) {
    if (!db) {
        db = getFirestore();
    }
    return;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'development') {
      console.log('ADMIN: Emulator mode');
      process.env['FIREBASE_AUTH_EMULATOR_HOST'] = '127.0.0.1:9099';
      admin.initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project' });
      db = getFirestore();
      db.settings({
        host: "localhost:8080",
        ssl: false
      });
      return;
    }
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY missing. Admin init failed.');
  }

  try {
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = getFirestore();
  } catch (error) {
    console.error("ADMIN: Error parsing FIREBASE_SERVICE_ACCOUNT_KEY or initializing app:", error);
    throw new Error('Failed to initialize Firebase Admin SDK. Check service account key.');
  }
}

export { db as adminDb };

    