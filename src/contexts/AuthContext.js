"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// Create the Authentication Context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Register new user
  const register = async (email, password, displayName) => {
    try {
      setError(null);
      setLoading(true);

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Update user profile with display name
      await updateProfile(user, {
        displayName: displayName,
      });

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password, rememberMe = false) => {
    try {
      setError(null);
      setLoading(true);

      // Set persistence based on rememberMe option
      const persistence = rememberMe
        ? browserLocalPersistence // Persists across browser sessions
        : browserSessionPersistence; // Clears when browser is closed

      await setPersistence(auth, persistence);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Get user data from Firestore
  const getUserData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      setError(null);

      if (user) {
        // Update Firebase Auth profile
        if (updates.displayName) {
          await updateProfile(user, {
            displayName: updates.displayName,
          });
        }

        // Update Firestore user document
        await setDoc(
          doc(db, "users", user.uid),
          {
            ...updates,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        const userData = await getUserData(user.uid);
        setUser({
          ...user,
          ...userData,
        });
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Reset error
  const clearError = () => setError(null);

  // Context value
  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    getUserData,
    updateUserProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
