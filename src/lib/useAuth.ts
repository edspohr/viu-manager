import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import type { UserRole } from '../store/useStore';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole | 'pending';
}

const SUPERADMIN_EMAIL = 'edmundo@spohr.cl';

async function ensureUserDoc(firebaseUser: User): Promise<AppUser> {
  const ref = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as AppUser;
  }

  // First-ever sign-in — create user doc
  const isInitialSuperadmin = firebaseUser.email === SUPERADMIN_EMAIL;
  const newUser: AppUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    displayName: firebaseUser.displayName ?? firebaseUser.email ?? 'Usuario',
    photoURL: firebaseUser.photoURL,
    role: isInitialSuperadmin ? 'superadmin' : 'pending',
  };
  await setDoc(ref, newUser);
  return newUser;
}

interface AuthState {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubUser) { unsubUser(); unsubUser = null; }

      if (!fbUser) {
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setFirebaseUser(fbUser);
      // Ensure doc exists, then subscribe to real-time role changes
      await ensureUserDoc(fbUser);
      unsubUser = onSnapshot(doc(db, 'users', fbUser.uid), (snap) => {
        if (snap.exists()) {
          setUser(snap.data() as AppUser);
        }
        setLoading(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubUser) unsubUser();
    };
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const registerWithEmail = async (email: string, password: string, name: string) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Update display name in our Firestore doc
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email ?? email,
        displayName: name,
        photoURL: null,
        role: email === SUPERADMIN_EMAIL ? 'superadmin' : 'pending',
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return { user, firebaseUser, loading, error, signInWithGoogle, signInWithEmail, registerWithEmail, signOut };
}
