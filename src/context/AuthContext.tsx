import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, pass: string, displayName: string, username: string, photoURL?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitor Auth state & User Profile in Firestore
  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);

        // Listen to live user profile
        unsubscribeDoc = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, () => {
          setLoading(false);
        });

        // Update online status
        await updateDoc(userRef, {
          isOnline: true,
          lastSeen: Date.now(),
        }).catch(() => {
          // If doc doesn't exist yet (during registration), will be handled in signup
        });
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  // Presence listener (page unload / tab visibility)
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateDoc(userRef, { isOnline: false, lastSeen: Date.now() }).catch(() => {});
      } else {
        updateDoc(userRef, { isOnline: true, lastSeen: Date.now() }).catch(() => {});
      }
    };

    const handleBeforeUnload = () => {
      updateDoc(userRef, { isOnline: false, lastSeen: Date.now() }).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const clean = username.trim().toLowerCase();
    if (!clean) return false;
    try {
      const q = query(collection(db, 'users'), where('usernameLower', '==', clean));
      const snap = await getDocs(q);
      if (snap.empty) return true;
      if (user && snap.docs.length === 1 && snap.docs[0].id === user.uid) {
        return true;
      }
      return false;
    } catch {
      // Allow proceeding if rules or offline state prevents pre-checking
      return true;
    }
  };

  const signup = async (
    email: string,
    pass: string,
    displayName: string,
    username: string,
    photoURL?: string
  ) => {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername) throw new Error('Username must contain letters, numbers, or underscores.');

    // Authenticate FIRST so the user possesses a valid request.auth.uid for Firestore security rules
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    const defaultAvatar = photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

    await updateProfile(res.user, {
      displayName: displayName.trim(),
      photoURL: defaultAvatar,
    }).catch(() => {});

    const newProfile: UserProfile = {
      uid: res.user.uid,
      email: res.user.email || email,
      displayName: displayName.trim(),
      username: cleanUsername,
      usernameLower: cleanUsername,
      photoURL: defaultAvatar,
      bio: 'Hey there! I am using 1-to-1 Video & Chat.',
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now(),
    };

    await setDoc(doc(db, 'users', res.user.uid), newProfile);
    setProfile(newProfile);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const res = await signInWithPopup(auth, provider);
    const currentUser = res.user;

    const userRef = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      let base = (currentUser.email?.split('@')[0] || currentUser.displayName || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
      if (base.length < 3) base = 'user_' + base;
      let finalUsername = base;
      const isAvail = await checkUsernameAvailable(finalUsername);
      if (!isAvail) {
        finalUsername = `${base}_${Math.floor(100 + Math.random() * 900)}`;
      }

      const defaultAvatar =
        currentUser.photoURL ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${finalUsername}`;

      const newProfile: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || finalUsername,
        username: finalUsername,
        usernameLower: finalUsername.toLowerCase(),
        photoURL: defaultAvatar,
        bio: 'Hey there! I am using WhatsApp.',
        isOnline: true,
        lastSeen: Date.now(),
        createdAt: Date.now(),
      };

      await setDoc(userRef, newProfile);
      setProfile(newProfile);
    } else {
      setProfile(snap.data() as UserProfile);
      await updateDoc(userRef, { isOnline: true, lastSeen: Date.now() }).catch(() => {});
    }
  };

  const login = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    const userRef = doc(db, 'users', res.user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      await updateDoc(userRef, { isOnline: true, lastSeen: Date.now() });
    }
  };

  const logout = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          isOnline: false,
          lastSeen: Date.now(),
        });
      } catch {}
    }
    await signOut(auth);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const updates: Partial<UserProfile> = { ...data };
    if (data.username) {
      const clean = data.username.trim().toLowerCase();
      const available = await checkUsernameAvailable(clean);
      if (!available) throw new Error(`Username @${clean} is taken.`);
      updates.username = clean;
      updates.usernameLower = clean;
    }
    await updateDoc(userRef, updates);
    if (data.displayName || data.photoURL) {
      await updateProfile(user, {
        displayName: data.displayName || user.displayName,
        photoURL: data.photoURL || user.photoURL,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        loginWithGoogle,
        signup,
        logout,
        resetPassword,
        updateUserProfile,
        checkUsernameAvailable,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
