"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

// Create the Notes Context
const NotesContext = createContext();

// Custom hook to use the notes context
export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within a NotesProvider");
  }
  return context;
};

// NotesProvider component
export const NotesProvider = ({ children }) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create a new note
  const createNote = async (noteData) => {
    try {
      setError(null);
      setLoading(true);

      if (!user) {
        throw new Error("User must be authenticated to create notes");
      }

      const noteToCreate = {
        ...noteData,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        id: null, // Will be set by Firestore
      };

      const docRef = await addDoc(collection(db, "notes"), noteToCreate);

      // Update the note with its ID
      await updateDoc(docRef, { id: docRef.id });

      const newNote = {
        ...noteToCreate,
        id: docRef.id,
      };

      // Update local state
      setNotes((prevNotes) => [newNote, ...prevNotes]);

      return newNote;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get all notes for the current user
  const getNotes = async () => {
    try {
      setError(null);
      setLoading(true);

      if (!user) {
        setNotes([]);
        return [];
      }

      const q = query(
        collection(db, "notes"),
        where("userId", "==", user.uid),
        orderBy("updatedAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const userNotes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotes(userNotes);
      return userNotes;
    } catch (error) {
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get a specific note by ID
  const getNoteById = async (noteId) => {
    try {
      setError(null);

      if (!user) {
        throw new Error("User must be authenticated to access notes");
      }

      const docRef = doc(db, "notes", noteId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const noteData = { id: docSnap.id, ...docSnap.data() };

        // Verify the note belongs to the current user
        if (noteData.userId !== user.uid) {
          throw new Error("Access denied: This note does not belong to you");
        }

        return noteData;
      } else {
        throw new Error("Note not found");
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Update an existing note
  const updateNote = async (noteId, updates) => {
    try {
      setError(null);
      setLoading(true);

      if (!user) {
        throw new Error("User must be authenticated to update notes");
      }

      const noteRef = doc(db, "notes", noteId);

      // First verify the note exists and belongs to the user
      const noteSnap = await getDoc(noteRef);
      if (!noteSnap.exists()) {
        throw new Error("Note not found");
      }

      const noteData = noteSnap.data();
      if (noteData.userId !== user.uid) {
        throw new Error("Access denied: This note does not belong to you");
      }

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(noteRef, updateData);

      // Update local state
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === noteId ? { ...note, ...updateData } : note
        )
      );

      return { id: noteId, ...noteData, ...updateData };
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Delete a note
  const deleteNote = async (noteId) => {
    try {
      setError(null);
      setLoading(true);

      if (!user) {
        throw new Error("User must be authenticated to delete notes");
      }

      const noteRef = doc(db, "notes", noteId);

      // First verify the note exists and belongs to the user
      const noteSnap = await getDoc(noteRef);
      if (!noteSnap.exists()) {
        throw new Error("Note not found");
      }

      const noteData = noteSnap.data();
      if (noteData.userId !== user.uid) {
        throw new Error("Access denied: This note does not belong to you");
      }

      await deleteDoc(noteRef);

      // Update local state
      setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));

      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Search notes
  const searchNotes = (searchTerm) => {
    if (!searchTerm.trim()) {
      return notes;
    }

    const searchLower = searchTerm.toLowerCase();
    return notes.filter(
      (note) =>
        note.title?.toLowerCase().includes(searchLower) ||
        note.content?.toLowerCase().includes(searchLower) ||
        note.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  };

  // Filter notes by category
  const getNotesByCategory = (category) => {
    if (!category) {
      return notes;
    }
    return notes.filter((note) => note.category === category);
  };

  // Get notes by tags
  const getNotesByTag = (tag) => {
    if (!tag) {
      return notes;
    }
    return notes.filter((note) => note.tags?.includes(tag));
  };

  // Real-time subscription to notes
  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }

    const q = query(
      collection(db, "notes"),
      where("userId", "==", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const userNotes = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotes(userNotes);
      },
      (error) => {
        console.error("Error in notes subscription:", error);
        setError(error.message);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Clear error
  const clearError = () => setError(null);

  // Context value
  const value = {
    notes,
    loading,
    error,
    createNote,
    getNotes,
    getNoteById,
    updateNote,
    deleteNote,
    searchNotes,
    getNotesByCategory,
    getNotesByTag,
    clearError,
  };

  return (
    <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
  );
};
