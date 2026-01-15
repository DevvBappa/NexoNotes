"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotes } from "@/contexts/NotesContext";
import { withAuth } from "@/components/auth/ProtectedRoute";

function NotesPage() {
  const { user, logout } = useAuth();
  const { notes, loading, error, deleteNote } = useNotes();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [deleting, setDeleting] = useState(null);

  // Extract unique categories from notes
  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(notes.map((note) => note.category).filter(Boolean)),
    ];
    return ["All", ...uniqueCategories];
  }, [notes]);

  // Filter notes based on search and category
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch =
        note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags?.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        );
      const matchesCategory =
        selectedCategory === "All" || note.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [notes, searchTerm, selectedCategory]);

  // Handle note deletion
  const handleDeleteNote = async (noteId, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      setDeleting(noteId);
      await deleteNote(noteId);
    } catch (error) {
      alert("Failed to delete note: " + error.message);
    } finally {
      setDeleting(null);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href="/"
                className="text-2xl font-bold text-white hover:scale-105 transition-transform duration-200"
              >
                NexoNotes
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white text-sm hidden md:inline">
                Welcome, {user?.displayName || user?.email}
              </span>
              <Link
                href="/notes/create"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Create Note
              </Link>
              <button
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 text-white p-4 rounded-lg">
            Error: {error}
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-xl">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-12 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                  <svg
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Category Filter */}
              <div className="md:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  {categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                      className="bg-gray-800"
                    >
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && notes.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-white mt-4">Loading your notes...</p>
          </div>
        )}
        {/* Loading State */}
        {loading && notes.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-white mt-4">Loading your notes...</p>
          </div>
        )}

        {/* Notes Grid */}
        {!loading || notes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
                <div key={note.id} className="group relative">
                  <Link href={`/notes/${note.id}`}>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-white/15 cursor-pointer h-full">
                      <div className="flex flex-col h-full">
                        {/* Note Header */}
                        <div className="mb-4">
                          <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-300 transition-colors duration-200">
                            {note.title || "Untitled Note"}
                          </h3>
                          <p className="text-gray-300 text-sm line-clamp-3 mb-3">
                            {note.content || "No content"}
                          </p>
                        </div>

                        {/* Note Footer */}
                        <div className="mt-auto">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {note.tags?.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-400">
                            {note.category && (
                              <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-500/30">
                                {note.category}
                              </span>
                            )}
                            <span>{formatDate(note.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    disabled={deleting === note.id}
                    className="absolute top-4 right-4 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-300 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 disabled:opacity-50 z-10"
                    title="Delete note"
                  >
                    {deleting === note.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-300"></div>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-xl">
                  <svg
                    className="w-16 h-16 text-gray-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No notes found
                  </h3>
                  <p className="text-gray-300 mb-6">
                    {searchTerm || selectedCategory !== "All"
                      ? "Try adjusting your search or filter criteria."
                      : "Create your first note to get started!"}
                  </p>
                  <Link
                    href="/notes/create"
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create Your First Note
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default withAuth(NotesPage);
