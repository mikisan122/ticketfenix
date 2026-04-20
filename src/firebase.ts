import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase with the config provided by AIS
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

// Set persistence to Local
setPersistence(auth, browserLocalPersistence).catch(console.error);

export const googleProvider = new GoogleAuthProvider();

export default app;
