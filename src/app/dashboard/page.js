"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNotes } from "@/contexts/NotesContext";
import { withAuth } from "@/components/auth/ProtectedRoute";

function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { notes, loading } = useNotes();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const tagButtonRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
    visible: false,
  });

  // Close dropdown when clicking outside (also consider portal)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showTagDropdown &&
        !event.target.closest(".tag-filter-container") &&
        !event.target.closest(".tag-dropdown-portal")
      ) {
        setShowTagDropdown(false);
        setTagQuery("");
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showTagDropdown]);

  // Position the dropdown (for portal) whenever it opens or the window scrolls/resizes
  useEffect(() => {
    const updatePos = () => {
      const btn = tagButtonRef.current;
      if (btn && showTagDropdown) {
        const rect = btn.getBoundingClientRect();
        // Use viewport coordinates so we can render the portal with `position: fixed`
        setDropdownPos({
          top: rect.bottom,
          left: rect.left,
          width: rect.width,
          visible: true,
        });
      } else {
        setDropdownPos((p) => ({ ...p, visible: false }));
      }
    };

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [showTagDropdown]);

  // Handle logout
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // Wait a moment for animation to show
      await new Promise((resolve) => setTimeout(resolve, 800));
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  // Get all unique tags from notes (sorted alphabetically)
  const allTags = useMemo(() => {
    return [...new Set(notes.flatMap((note) => note.tags || []))];
  }, [notes]);

  const allTagsSorted = useMemo(() => {
    return allTags
      .slice()
      .sort((a, b) => a?.toLowerCase().localeCompare(b?.toLowerCase()));
  }, [allTags]);

  const filteredTags = useMemo(() => {
    if (!tagQuery.trim()) return allTagsSorted;
    return allTagsSorted.filter((t) =>
      t.toLowerCase().includes(tagQuery.trim().toLowerCase()),
    );
  }, [allTagsSorted, tagQuery]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    console.log("Filtering - selectedTag:", selectedTag);
    console.log(
      "All notes tags:",
      notes.map((n) => ({ title: n.title, tags: n.tags })),
    );

    return notes
      .filter(
        (note) =>
          note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.tags?.some((tag) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      )
      .filter((note) => {
        if (selectedTag === "") return true;
        const normalizedSelectedTag = selectedTag.replace(/^#/, "");
        console.log(
          "Checking note:",
          note.title,
          "tags:",
          note.tags,
          "normalized selected:",
          normalizedSelectedTag,
        );
        const matches = note.tags?.some(
          (tag) => tag.replace(/^#/, "") === normalizedSelectedTag,
        );
        console.log("Matches:", matches);
        return matches;
      })
      .sort((a, b) => {
        if (sortBy === "updated") {
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        } else if (sortBy === "created") {
          return new Date(b.createdAt) - new Date(a.createdAt);
        } else if (sortBy === "title") {
          return a.title?.localeCompare(b.title || "") || 0;
        }
        return 0;
      });
  }, [notes, searchTerm, selectedTag, sortBy]);

  // Get user initials for avatar
  const getUserInitial = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const stripHtml = (html = "") => {
    if (!html) return "";
    // Remove HTML tags
    const withoutTags = html.replace(/<[^>]+>/g, "");
    // Decode a few common HTML entities
    return withoutTags
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  };

  // Truncate by words (defaults to 12 words -> ~10-15 range) and append an ellipsis
  const truncateContent = (content, maxWords = 12) => {
    const text = stripHtml(content || "");
    if (!text) return "";
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(" ") + "...";
  };

  function TagDropdown({
    pos,
    tagQuery,
    setTagQuery,
    filteredTags,
    onSelect,
    onClear,
    totalCount,
  }) {
    const contentRef = useRef(null);

    // Rely on native scrolling and CSS (`overflow-y-auto` + `overscroll-behavior: contain`)
    // Add wheel and touch listeners so scroll events originating in the dropdown
    // don't bubble to the page (which can prevent the dropdown from scrolling).
    useEffect(() => {
      const el = contentRef.current;
      if (!el) return;

      let touchStartY = 0;

      const onWheel = (e) => {
        const delta = e.deltaY;
        const atTop = el.scrollTop === 0;
        const atBottom =
          Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) <= 1;

        // If the dropdown can scroll in the direction of the wheel, stop propagation
        // If it's at the edge, prevent default to stop the page from scrolling.
        if ((delta < 0 && !atTop) || (delta > 0 && !atBottom)) {
          e.stopPropagation();
        } else {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      const onTouchStart = (e) => {
        touchStartY = e.touches ? e.touches[0].clientY : 0;
      };

      const onTouchMove = (e) => {
        const currentY = e.touches ? e.touches[0].clientY : 0;
        const delta = touchStartY - currentY;
        const atTop = el.scrollTop === 0;
        const atBottom =
          Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) <= 1;

        // If the dropdown can scroll in the direction of the touch, stop propagation
        // If it's at the edge, prevent default to stop the page from scrolling.
        if ((delta < 0 && !atTop) || (delta > 0 && !atBottom)) {
          // Touch scrolling inside dropdown - prevent it from bubbling to parent
          e.stopPropagation();
        } else {
          // At edge - prevent default so page doesn't scroll
          e.preventDefault();
          e.stopPropagation();
        }
      };

      el.addEventListener("wheel", onWheel, { passive: false });
      el.addEventListener("touchstart", onTouchStart, { passive: true });
      el.addEventListener("touchmove", onTouchMove, { passive: false });

      return () => {
        el.removeEventListener("wheel", onWheel);
        el.removeEventListener("touchstart", onTouchStart);
        el.removeEventListener("touchmove", onTouchMove);
      };
    }, []);

    if (!pos?.visible) return null;

    return createPortal(
      <div
        className="tag-dropdown-portal"
        style={{
          position: "fixed",
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          width: `${pos.width}px`,
          zIndex: 99999,
          pointerEvents: "auto",
        }}
      >
        <div
          ref={contentRef}
          className="bg-white border border-gray-300 rounded-xl shadow-2xl max-h-56 overflow-y-auto overscroll-contain"
          style={{
            maxHeight: "14rem",
            overflowY: "auto",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
            msTouchAction: "pan-y",
          }}
          role="listbox"
          aria-label="Tag suggestions"
        >
          <div className="px-3 py-2 sticky top-0 bg-white border-b border-gray-100 text-gray-800">
            <input
              autoFocus
              type="text"
              placeholder="Search tags..."
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm"
            />
            <div className="mt-1 text-xs text-gray-500">
              Showing {filteredTags.length} of {totalCount} tags
            </div>
          </div>

          <button
            type="button"
            onClick={onClear}
            className="w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors text-black"
            style={{ color: "#000" }}
          >
            All Tags
          </button>

          {filteredTags.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-800">No tags found</div>
          ) : (
            filteredTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onSelect(tag)}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors text-black"
              >
                #{tag.replace(/^#/, "")}
              </button>
            ))
          )}
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 animate-fade-in">
      {/* Logging Out Overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center z-50 animate-fade-in">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-white mx-auto mb-6"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-white animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
            </div>
            <p className="text-white text-xl font-semibold animate-pulse">
              Logging out...
            </p>
            <p className="text-white/70 text-sm mt-2">See you soon!</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="glass-effect shadow-elevation-2 border-b animate-fade-in-down sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                href="/"
                className="text-2xl font-bold text-gradient hover:scale-105 transition-all duration-300 animate-pop-up text-shadow-soft"
              >
                NexoNotes
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/notes/create"
                className="btn-primary-enhanced micro-interaction flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
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
                <span>New Note</span>
              </Link>
              <div className="flex items-center space-x-3 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center font-semibold shadow-elevation-1 float-animation">
                  {getUserInitial()}
                </div>
                <span className="text-gray-700 font-medium text-shadow-soft">
                  {user?.displayName || user?.email?.split("@")[0] || "User"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-slide-up">
          <div className="glass-effect rounded-2xl p-8 border shadow-elevation-2">
            <h1 className="text-4xl font-bold text-gradient mb-3 text-shadow-soft">
              Welcome back,{" "}
              {user?.displayName || user?.email?.split("@")[0] || "User"}! 👋
            </h1>
            <p className="text-gray-600 text-lg">
              You have{" "}
              <span className="font-semibold text-blue-600">
                {notes.length}
              </span>{" "}
              notes in your collection.
            </p>
            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full pulse-animation"></div>
                <span>All systems operational</span>
              </div>
              <div className="flex items-center space-x-1">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Last sync: Just now</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && notes.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your notes...</p>
          </div>
        )}

        {/* Loading State */}
        {loading && notes.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your notes...</p>
          </div>
        )}

        {/* Search and Filters */}
        {!loading || notes.length > 0 ? (
          <div className="gradient-border mb-8 animate-slide-up animation-delay-200">
            <div className="gradient-border-inner">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <svg
                  className="w-6 h-6 text-blue-600"
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
                <span>Find Your Notes</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Search */}
                <div className="space-y-2">
                  <label
                    htmlFor="search"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Search Notes
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="search"
                      placeholder="Search by title, content, or tags..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-elevation-1 hover:shadow-elevation-2 placeholder-black"
                    />
                    <svg
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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

                {/* Tag Filter */}
                <div className="space-y-2 tag-filter-container">
                  <label
                    htmlFor="tag-filter"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Filter by Tag
                  </label>
                  <div className="relative">
                    <button
                      ref={tagButtonRef}
                      type="button"
                      onClick={() => setShowTagDropdown(!showTagDropdown)}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-elevation-1 hover:shadow-elevation-2 bg-white text-left"
                    >
                      <span className="text-black" style={{ color: "#000" }}>
                        {selectedTag
                          ? `#${selectedTag.replace(/^#/, "")}`
                          : "All Tags"}
                      </span>
                    </button>
                    <svg
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    {showTagDropdown && (
                      <TagDropdown
                        pos={dropdownPos}
                        tagQuery={tagQuery}
                        setTagQuery={setTagQuery}
                        filteredTags={filteredTags}
                        totalCount={allTagsSorted.length}
                        onSelect={(tag) => {
                          setSelectedTag(tag);
                          setShowTagDropdown(false);
                          setTagQuery("");
                        }}
                        onClear={() => {
                          setSelectedTag("");
                          setShowTagDropdown(false);
                          setTagQuery("");
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Sort */}
                <div className="space-y-2">
                  <label
                    htmlFor="sort"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Sort By
                  </label>
                  <div className="relative">
                    <select
                      id="sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-elevation-1 hover:shadow-elevation-2 appearance-none bg-white placeholder-black"
                    >
                      <option value="updated">📅 Last Updated</option>
                      <option value="created">🆕 Date Created</option>
                      <option value="title">🔤 Title</option>
                    </select>
                    <svg
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Notes Grid */}
        {!loading && filteredNotes.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="glass-effect rounded-2xl p-12 max-w-md mx-auto">
              <div className="mb-6">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400 float-animation"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm || selectedTag
                  ? "No matching notes found"
                  : "No notes yet"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || selectedTag
                  ? "Try adjusting your search criteria or create a new note."
                  : "Start building your knowledge base by creating your first note."}
              </p>
              <Link
                href="/notes/create"
                className="btn-primary-enhanced inline-flex items-center micro-interaction"
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
        ) : (
          <>
            {/* Results Header */}
            <div className="flex justify-between items-center mb-6 animate-slide-up animation-delay-300">
              <h2 className="text-2xl font-semibold text-gray-900">
                {searchTerm || selectedTag ? (
                  <>
                    Found {filteredNotes.length} note
                    {filteredNotes.length !== 1 ? "s" : ""}
                    {searchTerm && (
                      <span className="text-blue-600">
                        {" "}
                        for &ldquo;{searchTerm}&rdquo;
                      </span>
                    )}
                    {selectedTag && (
                      <span className="text-purple-600">
                        {" "}
                        in #{selectedTag}
                      </span>
                    )}
                  </>
                ) : (
                  `Your Notes (${filteredNotes.length})`
                )}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
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
                    d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"
                  />
                </svg>
                <span>
                  Sorted by{" "}
                  {sortBy === "updated"
                    ? "last updated"
                    : sortBy === "created"
                      ? "date created"
                      : "title"}
                </span>
              </div>
            </div>

            {/* Notes Grid */}
            <div className="notes-grid">
              {filteredNotes.map((note, index) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className="dashboard-card group micro-interaction animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="p-6">
                    {/* Note Header */}
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2 text-shadow-soft">
                        {note.title || "Untitled Note"}
                      </h3>
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                        <svg
                          className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Note Content Preview */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                      {truncateContent(note.content)}
                    </p>

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {note.tags.slice(0, 3).map((tag, tagIndex) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 hover:from-blue-200 hover:to-purple-200 transition-all duration-200"
                            style={{
                              animationDelay: `${
                                index * 100 + tagIndex * 50
                              }ms`,
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                            +{note.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Note Footer */}
                    <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-1">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>Updated {formatDate(note.updatedAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-9 0h10a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"
                          />
                        </svg>
                        <span>Created {formatDate(note.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default withAuth(Dashboard);
