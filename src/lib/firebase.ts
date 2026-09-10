import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

// Fallback values from user's custom Firebase project
export const DEFAULT_CONFIG = {
  projectId: "callcam-a7ea0",
  appId: "1:1033574410578:web:e8c7483b109953635f728b",
  apiKey: "AIzaSyDVD7fOGn8wXrfA2URUqKtHg15xtB3Fx6k",
  authDomain: "callcam-a7ea0.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "callcam-a7ea0.firebasestorage.app",
  messagingSenderId: "1033574410578",
  measurementId: "G-44LH83WPCS",
};

let loadedRawConfig = DEFAULT_CONFIG;
try {
  // @ts-ignore
  if (typeof rawConfig === 'object' && rawConfig !== null) {
    loadedRawConfig = { ...DEFAULT_CONFIG, ...rawConfig };
  }
} catch {
  // Use DEFAULT_CONFIG
}

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || loadedRawConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || loadedRawConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || loadedRawConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || loadedRawConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || loadedRawConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || loadedRawConfig.appId,
};

const databaseId =
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
  loadedRawConfig.firestoreDatabaseId ||
  '(default)';

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Enforce permanent local persistence so the user stays logged in until they clear browser cache or log out
try {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase auth persistence warning:', err);
  });
} catch {}

export const db =
  databaseId && databaseId !== '(default)'
    ? getFirestore(app, databaseId)
    : getFirestore(app);
