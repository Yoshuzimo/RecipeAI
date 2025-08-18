
import * as admin from 'firebase-admin';

export function initFirebaseAdmin() {
  if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.NODE_ENV === 'development') {
       console.log("Firebase Admin SDK running in emulator mode. Set FIREBASE_SERVICE_ACCOUNT_KEY for production.")
       process.env['FIREBASE_AUTH_EMULATOR_HOST'] = '127.0.0.1:9099';
       admin.initializeApp({
           projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
       });
    } else {
        console.error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Firebase Admin initialization failed.");
    }
  }
}
