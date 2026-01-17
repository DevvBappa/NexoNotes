// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Only initialize Firebase in the browser and when API key is present
const isBrowser = typeof window !== "undefined";
const hasApiKey = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

const app = (isBrowser && hasApiKey) ? initializeApp(firebaseConfig) : null;

// Export client-side service instances if initialized, otherwise export nulls
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

export const analytics = (isBrowser && app)
  ? (async () => {
      if (await isSupported()) {
        return getAnalytics(app);
      }
      return null;
    })()
  : null;

// Export the Firebase app instance (may be null during SSR/build)
export default app;
