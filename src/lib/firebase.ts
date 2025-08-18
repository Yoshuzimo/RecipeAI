
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

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Connect to Emulator if in development
if (process.env.NODE_ENV === 'development') {
    // Check if the emulator is already connected to avoid errors
    // @ts-ignore The _settings property is not in the public API but is a reliable way to check for emulator connection.
    if (!db._settings.host) {
        try {
            connectFirestoreEmulator(db, 'localhost', 8080);
            console.log("Connecting to Firestore emulator");
        } catch (e) {
            console.error("Error connecting to Firestore emulator:", e);
        }
    }
}

export { db };
