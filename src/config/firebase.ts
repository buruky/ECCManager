import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAsCyS_ztHXGDxEZxJSRpnHLtQdgjgYn6E',
  authDomain: 'ecc-manager-aa6a1.firebaseapp.com',
  projectId: 'ecc-manager-aa6a1',
  storageBucket: 'ecc-manager-aa6a1.firebasestorage.app',
  messagingSenderId: '566636614562',
  appId: '1:566636614562:web:99f3e0c15293bc06dd98fb',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
