import admin from 'firebase-admin';
import type {Auth} from 'firebase-admin/auth';
import type {Firestore, FieldValue} from 'firebase-admin/firestore';

let adminInstance: {
  auth: Auth;
  db: Firestore;
  FieldValue: typeof FieldValue;
} | null = null;

if (process.env.NODE_ENV === 'production' && admin.apps.length === 0) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set for production.');
  }
  const serviceAccount = JSON.parse(serviceAccountKey);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else if (process.env.NODE_ENV !== 'production' && admin.apps.length === 0) {
    // This is for local development with emulators
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    admin.initializeApp({
        projectId: 'demo-project',
    });
}


const auth = admin.auth();
const db = admin.firestore();
const { FieldValue } = admin.firestore;


export { db, auth, FieldValue };
