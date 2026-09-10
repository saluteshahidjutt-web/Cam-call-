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
  loginAsGuest: (guestName?: string) => Promise<void>;
  signup: (email: string, pass: string, displayName: string, username: string, photoURL?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = 'callcam_auth_session';
const PROFILE_STORAGE_KEY = 'callcam_auth_profile';

function getCachedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as UserProfile;
  } catch {}
  return null;
}

function saveCachedProfile(profile: UserProfile | null) {
  try {
    if (profile) {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      localStorage.setItem(AUTH_STORAGE_KEY, profile.uid);
    } else {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {}
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile | null>(() => getCachedProfile());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !getCachedProfile());

  const setProfile = (newProf: UserProfile | null) => {
    setProfileState(newProf);
    saveCachedProfile(newProf);
  };

  // Monitor Auth state & User Profile in Firestore
  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;
    let isMounted = true;

    // Safety timeout: Never keep the user waiting more than 1.5 seconds on initial boot
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1200);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;
      setUser(currentUser);

      if (currentUser) {
        const cleanName =
          currentUser.displayName ||
          (currentUser.isAnonymous ? 'Guest User' : currentUser.email?.split('@')[0] || 'User');
        const cleanUser =
          cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '') ||
          `user_${currentUser.uid.slice(0, 5)}`;

        const cached = getCachedProfile();
        const defaultFallbackProfile: UserProfile = cached?.uid === currentUser.uid ? cached : {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: cleanName,
          username: cleanUser,
          usernameLower: cleanUser.toLowerCase(),
          photoURL:
            currentUser.photoURL ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
          bio: 'Hey there! I am using Call CAM.',
          isOnline: true,
          lastSeen: Date.now(),
          createdAt: Date.now(),
        };

        setProfile(defaultFallbackProfile);
        setLoading(false);

        const userRef = doc(db, 'users', currentUser.uid);

        // Listen to live user profile
        unsubscribeDoc = onSnapshot(
          userRef,
          (snapshot) => {
            if (!isMounted) return;
            if (snapshot.exists()) {
              const liveData = snapshot.data() as UserProfile;
              setProfile(liveData);
            } else {
              // Doc does not exist yet in Firestore, persist fallback
              setProfile(defaultFallbackProfile);
              setDoc(userRef, defaultFallbackProfile, { merge: true }).catch(() => {});
            }
            setLoading(false);
          },
          (error) => {
            console.warn('Firestore user profile snapshot error:', error);
            if (!isMounted) return;
            // On Firestore error/offline, keep the cached profile so user can proceed
            setProfile(defaultFallbackProfile);
            setLoading(false);
          }
        );

        // Update online status in background
        updateDoc(userRef, {
          isOnline: true,
          lastSeen: Date.now(),
        }).catch(() => {});
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        // If we don't have a currentUser from Firebase Auth, check if user had a cached session
        const cached = getCachedProfile();
        if (!cached) {
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
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
      // Fast timeout: Do not hang for more than 1 second
      const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 1000));
      const fetchPromise = getDocs(q).then((snap) => {
        if (snap.empty) return true;
        if (user && snap.docs.length === 1 && snap.docs[0].id === user.uid) {
          return true;
        }
        return false;
      });
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch {
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
    let cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername) {
      cleanUsername = (displayName.trim() || email.split('@')[0] || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
      if (cleanUsername.length < 3) {
        cleanUsername = `${cleanUsername || 'user'}_${Math.floor(100 + Math.random() * 900)}`;
      }
    }

    // Authenticate instantly
    const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const resolvedDisplayName = displayName.trim() || cleanUsername;
    const defaultAvatar = photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

    const newProfile: UserProfile = {
      uid: res.user.uid,
      email: res.user.email || email.trim(),
      displayName: resolvedDisplayName,
      username: cleanUsername,
      usernameLower: cleanUsername,
      photoURL: defaultAvatar,
      bio: 'Hey there! I am using Call CAM.',
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now(),
    };

    // Update state synchronously for instant UI transition
    setProfile(newProfile);
    setUser(res.user);

    // Run remote updates in background without blocking the user
    updateProfile(res.user, {
      displayName: resolvedDisplayName,
      photoURL: defaultAvatar,
    }).catch(() => {});

    setDoc(doc(db, 'users', res.user.uid), newProfile, { merge: true }).catch((dbErr) => {
      console.warn('Background profile save:', dbErr);
    });
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const res = await signInWithPopup(auth, provider);
    const currentUser = res.user;

    let base = (currentUser.email?.split('@')[0] || currentUser.displayName || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');
    if (base.length < 3) base = 'user_' + base;
    const defaultAvatar =
      currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`;

    const initialProfile: UserProfile = {
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: currentUser.displayName || base,
      username: base,
      usernameLower: base.toLowerCase(),
      photoURL: defaultAvatar,
      bio: 'Hey there! I am using Call CAM.',
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now(),
    };

    setProfile(initialProfile);
    setUser(currentUser);

    // Sync in background
    const userRef = doc(db, 'users', currentUser.uid);
    getDoc(userRef)
      .then((snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
          updateDoc(userRef, { isOnline: true, lastSeen: Date.now() }).catch(() => {});
        } else {
          setDoc(userRef, initialProfile, { merge: true }).catch(() => {});
        }
      })
      .catch(() => {});
  };

  const loginAsGuest = async (customName?: string) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const guestUsername = `guest_${Date.now().toString().slice(-4)}${randomSuffix}`;
    const guestEmail = `${guestUsername}@quickaccess.local`;
    const guestPassword = `GuestP@ss${Math.random().toString(36).slice(2, 8)}123`;
    const guestDisplayName = customName?.trim() || `Guest ${randomSuffix}`;

    const res = await createUserWithEmailAndPassword(auth, guestEmail, guestPassword);
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${guestUsername}`;

    const newProfile: UserProfile = {
      uid: res.user.uid,
      email: guestEmail,
      displayName: guestDisplayName,
      username: guestUsername,
      usernameLower: guestUsername.toLowerCase(),
      photoURL: defaultAvatar,
      bio: 'Joined via Quick Call Access',
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now(),
    };

    setProfile(newProfile);
    setUser(res.user);

    updateProfile(res.user, {
      displayName: guestDisplayName,
      photoURL: defaultAvatar,
    }).catch(() => {});

    setDoc(doc(db, 'users', res.user.uid), newProfile, { merge: true }).catch(() => {});
  };

  const login = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
    setUser(res.user);
    // Background presence ping without blocking login
    updateDoc(doc(db, 'users', res.user.uid), {
      isOnline: true,
      lastSeen: Date.now(),
    }).catch(() => {});
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
        loginAsGuest,
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
