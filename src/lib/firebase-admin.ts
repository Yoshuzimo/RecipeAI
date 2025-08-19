
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let adminInstance: {
    auth: ReturnType<typeof getAuth>;
    db: ReturnType<typeof getFirestore>;
    FieldValue: typeof FieldValue;
} | null = null;


export function initFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return;
    }
    
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
    }
    
    const serviceAccount = JSON.parse(serviceAccountKey);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

export function getAdmin() {
    if (adminInstance) {
        return adminInstance;
    }

    initFirebaseAdmin();

    adminInstance = {
        auth: getAuth(),
        db: getFirestore(),
        FieldValue,
    };
    
    return adminInstance;
}
