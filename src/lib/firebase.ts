
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, Firestore, enableNetwork } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "demo",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "demo",
};

// A function to check if the emulator is already connected.
// The _settings property is not in the public API but is a reliable way to check.
const isEmulatorConnected = (dbInstance: Firestore) => {
    return (dbInstance as any)._settings?.host?.includes('localhost');
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Connect to Emulator if in development and not already connected.
if (process.env.NODE_ENV === 'development' && !isEmulatorConnected(db)) {
    try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log("Connecting to Firestore emulator");
        // Explicitly enable the network to signal the SDK to connect.
        enableNetwork(db);
    } catch (e) {
        // This catch block will prevent crashes if the connection is attempted multiple times during hot-reloads.
        console.warn("Could not connect to Firestore emulator. It might already be connected or is not running.");
    }
}

export { db };
