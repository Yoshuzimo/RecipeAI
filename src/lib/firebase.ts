
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, Firestore, enableNetwork } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';


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
const auth = getAuth(app);


// Connect to Emulator if in development.
if (process.env.NODE_ENV === 'development') {
    try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        connectAuthEmulator(auth, 'http://localhost:9099');
        console.log("Connecting to Firebase emulators");
    } catch (e) {
        console.warn("Could not connect to Firebase emulators. They might already be connected or are not running.");
    }
}

export { app, db, auth };
