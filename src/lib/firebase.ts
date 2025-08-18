
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "demo",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "demo",
};

let db: Firestore;

try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);

    // This check ensures we only try to connect to the emulator in a browser-like environment.
    // Server components will not have `window` defined.
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        // A simple flag to prevent multiple connection attempts in fast-refresh environments
        if (!(window as any)._firebaseEmulatorConnected) {
            connectFirestoreEmulator(db, 'localhost', 8080);
            console.log("Connecting to Firestore emulator");
            (window as any)._firebaseEmulatorConnected = true;
        }
    }
} catch (e) {
    console.error("Firebase initialization failed:", e);
    // Fallback to a non-connected instance if initialization fails,
    // though operations will likely fail. This prevents the app from crashing.
    if (!db) {
      db = getFirestore(initializeApp(firebaseConfig, "fallback"));
    }
}


export { db };
