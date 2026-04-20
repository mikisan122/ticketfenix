import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import aisConfig from '../firebase-applet-config.json';

// Initialize Firebase with environment variables (preferred for Vercel) or fallback to local JSON
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || aisConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || aisConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || aisConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || aisConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || aisConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || aisConfig.appId
};

const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || (aisConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

// Set persistence to Local
setPersistence(auth, browserLocalPersistence).catch(console.error);

export const googleProvider = new GoogleAuthProvider();

export default app;
