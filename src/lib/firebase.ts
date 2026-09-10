import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

// Fallback values from provisioned Firebase project if config file or env is missing on Netlify/Vercel
const DEFAULT_CONFIG = {
  projectId: "sonic-program-ft8c4",
  appId: "1:713197969311:web:455f75543b96a4f24527aa",
  apiKey: "AIzaSyBxTSuGCeRfxiLqsZNwrHeVsY9Rlmi3q6g",
  authDomain: "sonic-program-ft8c4.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-1to1videocalling-6b1115ad-f9fc-4674-8c09-584f2892e381",
  storageBucket: "sonic-program-ft8c4.firebasestorage.app",
  messagingSenderId: "713197969311",
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

const firebaseConfig = {
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
export const db =
  databaseId && databaseId !== '(default)'
    ? getFirestore(app, databaseId)
    : getFirestore(app);
