import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
  MultiFactorResolver,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { getUserById, getUserByUsername } from '@/services/userService';
import { AppUser } from '@/types';
import { SESSION_DURATION_MS } from '@/utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'ecc_session_start';

// Exposed to the UI: just enough to render the right MFA prompt.
export type PendingMfaInfo = {
  factorId: string;       // 'totp' | 'phone'
  displayName?: string;   // label the user gave the factor during enrollment
};

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  pendingMfa: PendingMfaInfo | null;
  signIn: (emailOrUsername: string, password: string) => Promise<void>;
  completeMfaSignIn: (totpCode: string) => Promise<void>;
  cancelMfa: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  pendingMfa: null,
  signIn: async () => {},
  completeMfaSignIn: async () => {},
  cancelMfa: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMfa, setPendingMfa] = useState<PendingMfaInfo | null>(null);
  // Resolver lives in a ref so it doesn't trigger re-renders and is always fresh.
  const mfaResolverRef = useRef<MultiFactorResolver | null>(null);

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

  async function signIn(emailOrUsername: string, password: string) {
    let email = emailOrUsername.trim();
    if (!email.includes('@')) {
      const match = await getUserByUsername(email.toLowerCase());
      if (!match) throw new Error('No account found with that username.');
      email = match.email;
    }
    let uid: string;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
    } catch (error: any) {
      if (error?.code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, error);
        const totpHint = resolver.hints.find(
          (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID,
        );
        if (!totpHint) {
          throw new Error('Your account requires a MFA method that is not yet supported in this app. Contact your manager.');
        }
        mfaResolverRef.current = resolver;
        setPendingMfa({ factorId: totpHint.factorId, displayName: totpHint.displayName });
        return;
      }
      throw error;
    }
    await applyPostLoginChecks(uid);
  }

  async function completeMfaSignIn(totpCode: string) {
    const resolver = mfaResolverRef.current;
    if (!resolver) throw new Error('No MFA challenge in progress.');
    const hint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    if (!hint) throw new Error('TOTP factor not found.');
    const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, totpCode);
    const cred = await resolver.resolveSignIn(assertion);
    mfaResolverRef.current = null;
    setPendingMfa(null);
    await applyPostLoginChecks(cred.user.uid);
  }

  function cancelMfa() {
    mfaResolverRef.current = null;
    setPendingMfa(null);
  }

  async function applyPostLoginChecks(uid: string) {
    const appUser = await getUserById(uid);
    if (!appUser || !appUser.isActive) {
      await firebaseSignOut(auth);
      if (appUser?.status === 'pending') {
        throw new Error('Your account is pending approval. You will be able to sign in once a manager approves it.');
      }
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
    <AuthContext.Provider value={{ user, loading, pendingMfa, signIn, completeMfaSignIn, cancelMfa, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
