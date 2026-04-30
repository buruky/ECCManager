import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { getUserById } from '@/services/userService';
import { AppUser } from '@/types';
import { SESSION_DURATION_MS } from '@/utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'ecc_session_start';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const sessionStart = await AsyncStorage.getItem(SESSION_KEY);
        if (sessionStart) {
          const elapsed = Date.now() - parseInt(sessionStart, 10);
          if (elapsed > SESSION_DURATION_MS) {
            await firebaseSignOut(auth);
            setUser(null);
            setLoading(false);
            return;
          }
        }
        const appUser = await getUserById(firebaseUser.uid);
        if (appUser && appUser.isActive) {
          setUser(appUser);
        } else {
          await firebaseSignOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const appUser = await getUserById(cred.user.uid);
    if (!appUser || !appUser.isActive) {
      await firebaseSignOut(auth);
      throw new Error('Account is deactivated. Contact your manager.');
    }
    await AsyncStorage.setItem(SESSION_KEY, Date.now().toString());
    setUser(appUser);
  }

  async function signOut() {
    await AsyncStorage.removeItem(SESSION_KEY);
    await firebaseSignOut(auth);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
