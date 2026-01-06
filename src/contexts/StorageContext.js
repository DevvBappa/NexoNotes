"use client";

import React, { createContext, useContext, useState } from "react";
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

// Create the Storage Context
const StorageContext = createContext();

// Custom hook to use the storage context
export const useStorage = () => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error("useStorage must be used within a StorageProvider");
  }
  return context;
};

// StorageProvider component
export const StorageProvider = ({ children }) => {
  const { user } = useAuth();
  const [uploads, setUploads] = useState({});
  const [error, setError] = useState(null);

  // Upload a file
  const uploadFile = async (file, path, onProgress) => {
    try {
      setError(null);

      if (!user) {
        throw new Error("User must be authenticated to upload files");
      }

      if (!file) {
        throw new Error("No file provided");
      }

      // Create a unique path for the file
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const fullPath = path
        ? `${path}/${fileName}`
        : `users/${user.uid}/files/${fileName}`;

      const storageRef = ref(storage, fullPath);

      // If progress callback is provided, use resumable upload
      if (onProgress) {
        return new Promise((resolve, reject) => {
          const uploadTask = uploadBytesResumable(storageRef, file);

          // Track upload progress
          setUploads((prev) => ({
            ...prev,
            [fileName]: { progress: 0, status: "uploading", fileName },
          }));

          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

              // Update upload progress
              setUploads((prev) => ({
                ...prev,
                [fileName]: { ...prev[fileName], progress },
              }));

              onProgress(progress);
            },
            (error) => {
              // Handle upload error
              setUploads((prev) => ({
                ...prev,
                [fileName]: {
                  ...prev[fileName],
                  status: "error",
                  error: error.message,
                },
              }));
              setError(error.message);
              reject(error);
            },
            async () => {
              // Upload completed successfully
              try {
                const downloadURL = await getDownloadURL(
                  uploadTask.snapshot.ref
                );

                setUploads((prev) => ({
                  ...prev,
                  [fileName]: {
                    ...prev[fileName],
                    status: "completed",
                    downloadURL,
                    fullPath,
                  },
                }));

                resolve({
                  downloadURL,
                  fullPath,
                  fileName,
                  size: file.size,
                  type: file.type,
                });
              } catch (error) {
                setUploads((prev) => ({
                  ...prev,
                  [fileName]: {
                    ...prev[fileName],
                    status: "error",
                    error: error.message,
                  },
                }));
                reject(error);
              }
            }
          );
        });
      } else {
        // Simple upload without progress tracking
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        return {
          downloadURL,
          fullPath,
          fileName,
          size: file.size,
          type: file.type,
        };
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Upload multiple files
  const uploadMultipleFiles = async (files, path, onProgress) => {
    try {
      setError(null);

      if (!user) {
        throw new Error("User must be authenticated to upload files");
      }

      if (!files || files.length === 0) {
        throw new Error("No files provided");
      }

      const uploadPromises = Array.from(files).map((file, index) => {
        const fileProgress = onProgress
          ? (progress) => onProgress(index, progress)
          : null;
        return uploadFile(file, path, fileProgress);
      });

      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Delete a file
  const deleteFile = async (fullPath) => {
    try {
      setError(null);

      if (!user) {
        throw new Error("User must be authenticated to delete files");
      }

      if (!fullPath) {
        throw new Error("File path is required");
      }

      const storageRef = ref(storage, fullPath);
      await deleteObject(storageRef);

      // Remove from uploads state if it exists
      setUploads((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          if (updated[key].fullPath === fullPath) {
            delete updated[key];
          }
        });
        return updated;
      });

      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Get download URL for a file
  const getFileURL = async (fullPath) => {
    try {
      setError(null);

      if (!fullPath) {
        throw new Error("File path is required");
      }

      const storageRef = ref(storage, fullPath);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // List files in a directory
  const listFiles = async (path) => {
    try {
      setError(null);

      if (!user) {
        throw new Error("User must be authenticated to list files");
      }

      const listPath = path || `users/${user.uid}/files`;
      const storageRef = ref(storage, listPath);
      const result = await listAll(storageRef);

      const files = await Promise.all(
        result.items.map(async (itemRef) => {
          try {
            const downloadURL = await getDownloadURL(itemRef);
            return {
              name: itemRef.name,
              fullPath: itemRef.fullPath,
              downloadURL,
            };
          } catch (error) {
            console.error(`Error getting URL for ${itemRef.name}:`, error);
            return {
              name: itemRef.name,
              fullPath: itemRef.fullPath,
              downloadURL: null,
              error: error.message,
            };
          }
        })
      );

      return files;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Clear upload state
  const clearUploads = () => {
    setUploads({});
  };

  // Remove specific upload from state
  const removeUpload = (fileName) => {
    setUploads((prev) => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
  };

  // Clear error
  const clearError = () => setError(null);

  // Helper function to validate file type
  const validateFile = (
    file,
    allowedTypes = [],
    maxSize = 10 * 1024 * 1024
  ) => {
    if (!file) {
      throw new Error("No file provided");
    }

    if (file.size > maxSize) {
      throw new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      throw new Error(
        `File type ${
          file.type
        } is not allowed. Allowed types: ${allowedTypes.join(", ")}`
      );
    }

    return true;
  };

  // Context value
  const value = {
    uploads,
    error,
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    getFileURL,
    listFiles,
    clearUploads,
    removeUpload,
    clearError,
    validateFile,
  };

  return (
    <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
  );
};
