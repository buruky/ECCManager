import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// App Check blocks requests from unauthorized clients.
// Dev: generate a debug token in Firebase Console → App Check → Manage debug tokens,
//      then add EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN to your .env file.
// Prod: replace CustomProvider with @react-native-firebase/app-check (Play Integrity /
//       App Attest) before enabling enforcement in the Firebase Console.
const appCheckDebugToken = process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN;
if (appCheckDebugToken) {
  initializeAppCheck(app, {
    provider: new CustomProvider({
      getToken: () => Promise.resolve({
        token: appCheckDebugToken,
        expireTimeMillis: Date.now() + 3_600_000,
      }),
    }),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
