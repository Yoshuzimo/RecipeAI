import type {Auth} from 'firebase-admin/auth';
import type {Firestore, FieldValue} from 'firebase-admin/firestore';

let admin: any = null;

let adminInstance: {
  auth: Auth;
  db: Firestore;
  FieldValue: typeof FieldValue;
} | null = null;

export function initFirebaseAdmin() {
  if (admin) {
    return;
  }
  admin = require('firebase-admin');

  if (admin.apps.length > 0) {
    return;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
  }

  const serviceAccount = JSON.parse(serviceAccountKey);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export function getAdmin() {
  if (adminInstance) {
    return adminInstance;
  }

  initFirebaseAdmin();
  const {getAuth} = require('firebase-admin/auth');
  const {getFirestore, FieldValue} = require('firebase-admin/firestore');

  adminInstance = {
    auth: getAuth(),
    db: getFirestore(),
    FieldValue,
  };

  return adminInstance;
}

    