import * as admin from 'firebase-admin';

export function initFirebaseAdmin() {
  if (admin.apps.length) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Admin] Emulator mode');
      process.env['FIREBASE_AUTH_EMULATOR_HOST'] = '127.0.0.1:9099';
      admin.initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project' });
      return;
    }
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY missing. Admin init failed.');
  }

  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
