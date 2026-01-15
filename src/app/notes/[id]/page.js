"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotes } from "@/contexts/NotesContext";
import { withAuth } from "@/components/auth/ProtectedRoute";
// html2pdf is loaded dynamically inside the export function to avoid server-side eval errors (e.g., `self is not defined`).

function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getNoteById, updateNote, deleteNote } = useNotes();
  const noteContentRef = useRef(null);

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedTags, setEditedTags] = useState("");
  const contentEditRef = useRef(null);
  const imageInputRef = useRef(null);

  // Rich text editor states
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showListDropdown, setShowListDropdown] = useState(false);

  const [editedTagError, setEditedTagError] = useState("");
  const [parsedEditedTags, setParsedEditedTags] = useState([]);

  // Color options
  const textColors = [
    { name: "Black", value: "#000000" },
    { name: "Dark Gray", value: "#374151" },
    { name: "Gray", value: "#6B7280" },
    { name: "Red", value: "#EF4444" },
    { name: "Orange", value: "#F97316" },
    { name: "Yellow", value: "#EAB308" },
    { name: "Green", value: "#22C55E" },
    { name: "Blue", value: "#3B82F6" },
    { name: "Indigo", value: "#6366F1" },
    { name: "Purple", value: "#A855F7" },
    { name: "Pink", value: "#EC4899" },
    { name: "Teal", value: "#14B8A6" },
  ];

  const highlightColors = [
    { name: "None", value: "transparent" },
    { name: "Yellow", value: "#FEF08A" },
    { name: "Green", value: "#BBF7D0" },
    { name: "Blue", value: "#BFDBFE" },
    { name: "Purple", value: "#DDD6FE" },
    { name: "Pink", value: "#FBCFE8" },
    { name: "Orange", value: "#FED7AA" },
    { name: "Red", value: "#FECACA" },
    { name: "Gray", value: "#E5E7EB" },
  ];

  // Fetch note from Firebase
  useEffect(() => {
    const fetchNote = async () => {
      if (!params.id) return;

      try {
        setLoading(true);
        setError(null);
        const noteData = await getNoteById(params.id);
        setNote(noteData);
      } catch (err) {
        console.error("Error fetching note:", err);
        setError(err.message);
        // Redirect to dashboard if note not found
        setTimeout(() => router.push("/dashboard"), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [params.id, getNoteById, router]);

  const exportToPDF = async () => {
    if (!note) return;

    const normalizeTagsString = (str) => {
      if (!str) return { cleanString: "", tags: [], invalid: [] };

      const tokens = str.replace(/,/g, " ").trim().split(/\s+/);
      const validRegex = /^#[A-Za-z0-9_]+$/;

      const tags = [];
      const invalid = [];

      tokens.forEach((t) => {
        if (!t) return;
        let token = t.trim();
        if (!token.startsWith("#")) token = `#${token}`;
        token = token.replace(/[^#A-Za-z0-9_]/g, "");
        if (token.length < 2) {
          invalid.push(t);
          return;
        }
        if (validRegex.test(token)) {
          if (!tags.includes(token)) tags.push(token);
        } else {
          invalid.push(t);
        }
      });

      return { cleanString: tags.join(" "), tags, invalid };
    };

    setIsExporting(true);

    try {
      // Create a temporary container with title and content
      const pdfContainer = document.createElement("div");
      pdfContainer.style.padding = "30px";
      pdfContainer.style.backgroundColor = "white";
      pdfContainer.style.fontFamily = "Arial, sans-serif";
      pdfContainer.style.color = "#000000";
      pdfContainer.style.fontSize = "16px";
      pdfContainer.style.lineHeight = "1.6";

      // Add title
      const titleElement = document.createElement("h1");
      titleElement.textContent = note.title;
      titleElement.style.fontSize = "28px";
      titleElement.style.fontWeight = "bold";
      titleElement.style.marginBottom = "30px";
      titleElement.style.color = "#000000";
      titleElement.style.borderBottom = "2px solid #000000";
      titleElement.style.paddingBottom = "10px";
      pdfContainer.appendChild(titleElement);

      // Create content wrapper
      const contentWrapper = document.createElement("div");
      contentWrapper.innerHTML = note.content;
      contentWrapper.style.fontSize = "16px";
      contentWrapper.style.lineHeight = "1.6";
      contentWrapper.style.color = "#000000";

      // Fix ordered list counter display for PDF
      const orderedLists = contentWrapper.querySelectorAll("ol");
      orderedLists.forEach((ol) => {
        ol.style.listStyleType = "decimal";
        ol.style.paddingLeft = "40px";
        ol.style.marginBottom = "16px";
        ol.style.marginTop = "8px";

        const startValue = ol.getAttribute("start");
        if (startValue) {
          ol.setAttribute("start", startValue);
        }

        const listItems = ol.querySelectorAll("li");
        listItems.forEach((li) => {
          li.style.display = "list-item";
          li.style.listStyleType = "decimal";
          li.style.marginBottom = "8px";
          li.style.fontSize = "16px";
          li.style.color = "#000000";
        });
      });

      // Fix unordered list display for PDF
      const unorderedLists = contentWrapper.querySelectorAll("ul");
      unorderedLists.forEach((ul) => {
        ul.style.listStyleType = "disc";
        ul.style.paddingLeft = "40px";
        ul.style.marginBottom = "16px";
        ul.style.marginTop = "8px";

        const listItems = ul.querySelectorAll("li");
        listItems.forEach((li) => {
          li.style.display = "list-item";
          li.style.listStyleType = "disc";
          li.style.marginBottom = "8px";
          li.style.fontSize = "16px";
          li.style.color = "#000000";
        });
      });

      // Style all text elements
      const allElements = contentWrapper.querySelectorAll("*");
      allElements.forEach((el) => {
        if (!el.style.color || el.style.color === "") {
          el.style.color = "#000000";
        }
        if (!el.style.fontSize) {
          el.style.fontSize = "16px";
        }
      });

      // Style paragraphs
      const paragraphs = contentWrapper.querySelectorAll("p, div");
      paragraphs.forEach((p) => {
        p.style.marginBottom = "12px";
        p.style.color = "#000000";
      });

      pdfContainer.appendChild(contentWrapper);

      // Temporarily add to DOM
      pdfContainer.style.position = "absolute";
      pdfContainer.style.left = "-9999px";
      pdfContainer.style.top = "0";
      pdfContainer.style.width = "210mm"; // A4 width
      document.body.appendChild(pdfContainer);

      const opt = {
        margin: [15, 15, 15, 15],
        filename: `${note.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      // Dynamically import html2pdf only on the client to avoid `self`/SSR issues
      const { default: html2pdf } = await import("html2pdf.js");
      await html2pdf().set(opt).from(pdfContainer).save();

      // Clean up
      document.body.removeChild(pdfContainer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await deleteNote(note.id);
      router.push("/dashboard");
    } catch (err) {
      console.error("Error deleting note:", err);
      alert("Failed to delete note. Please try again.");
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedTitle(note.title);
    setEditedTags(
      note.tags && note.tags.length > 0
        ? note.tags.map((tag) => `#${tag}`).join(" ")
        : ""
    );

    // Set content in the editable div after state update
    setTimeout(() => {
      if (contentEditRef.current) {
        contentEditRef.current.innerHTML = note.content;
      }
    }, 0);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTitle("");
    setEditedTags("");
  };

  const handleSaveEdit = async () => {
    if (!editedTitle.trim()) {
      alert("Please enter a title for your note");
      return;
    }

    setIsSaving(true);
    try {
      const updatedContent = contentEditRef.current
        ? contentEditRef.current.innerHTML
        : note.content;

      const { tags: finalTags, invalid } = normalizeTagsString(editedTags);
      if (invalid.length) {
        alert(`Invalid tags: ${invalid.join(", ")}`);
        setIsSaving(false);
        return;
      }

      const updatedNote = {
        title: editedTitle.trim(),
        content: updatedContent,
        tags: finalTags.map((tag) => tag.replace(/^#/, "")),
      };

      await updateNote(note.id, updatedNote);

      // Update local state
      setNote({
        ...note,
        ...updatedNote,
        updatedAt: new Date().toISOString(),
      });

      setIsEditing(false);
      alert("Note updated successfully!");
    } catch (err) {
      console.error("Error updating note:", err);
      alert("Failed to update note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatText = (command, value = null) => {
    if (contentEditRef.current) {
      contentEditRef.current.focus();
    }
    document.execCommand(command, false, value);
    updateActiveFormats();
  };

  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  };

  const getCurrentListType = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    let node = selection.getRangeAt(0).commonAncestorContainer;
    while (node && node !== contentEditRef.current) {
      if (node.nodeName === "UL") return "bullet";
      if (node.nodeName === "OL") {
        const style = window.getComputedStyle(node);
        const listStyleType = style.listStyleType;
        if (
          listStyleType === "lower-alpha" ||
          node.getAttribute("type") === "a"
        )
          return "lower-alpha";
        if (
          listStyleType === "upper-alpha" ||
          node.getAttribute("type") === "A"
        )
          return "upper-alpha";
        return "numbered";
      }
      node = node.parentNode;
    }
    return null;
  };

  const applyListStyle = (listType) => {
    const currentListType = getCurrentListType();

    if (listType === "none") {
      if (currentListType === "bullet") {
        formatText("insertUnorderedList");
      } else if (currentListType) {
        formatText("insertOrderedList");
      }
      setShowListDropdown(false);
      return;
    }

    if (currentListType === listType) {
      if (listType === "bullet") {
        formatText("insertUnorderedList");
      } else {
        formatText("insertOrderedList");
      }
    } else if (listType === "bullet") {
      if (currentListType && currentListType !== "bullet") {
        formatText("insertOrderedList");
      }
      formatText("insertUnorderedList");
    } else {
      if (currentListType === "bullet") {
        formatText("insertUnorderedList");
      }
      if (!currentListType) {
        formatText("insertOrderedList");
      }

      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.commonAncestorContainer;
        while (node && node !== contentEditRef.current) {
          if (node.nodeName === "OL") {
            let styleType = "decimal";
            if (listType === "numbered") {
              styleType = "decimal";
              node.removeAttribute("type");
            } else if (listType === "lower-alpha") {
              styleType = "lower-alpha";
              node.setAttribute("type", "a");
            } else if (listType === "upper-alpha") {
              styleType = "upper-alpha";
              node.setAttribute("type", "A");
            }

            node.style.listStyleType = styleType;
            node.querySelectorAll("li").forEach((li) => {
              li.style.listStyleType = styleType;
              li.style.display = "list-item";
            });

            break;
          }
          node = node.parentNode;
        }
      }
    }

    setShowListDropdown(false);
  };

  const handleImageInsert = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement("img");
      img.src = event.target.result;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      img.style.margin = "10px 0";

      if (contentEditRef.current) {
        contentEditRef.current.focus();
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.insertNode(img);
          range.collapse(false);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading note...</p>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Note Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            {error ||
              "The note you're looking for doesn't exist or you don't have access to it."}
          </p>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Note Details</h1>
            </div>
            <Link
              href="/"
              className="text-xl font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              NexoNotes
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Title Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-3xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none w-full mr-4"
                  placeholder="Note title..."
                />
              ) : (
                <h2 className="text-3xl font-bold text-gray-900">
                  {note.title}
                </h2>
              )}
              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
                      title="Save Changes"
                    >
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{isSaving ? "Saving..." : "Save"}</span>
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
                      title="Cancel"
                    >
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEdit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2"
                      title="Edit Note"
                    >
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={exportToPDF}
                      disabled={isExporting}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
                      title="Export to PDF"
                    >
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
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>{isExporting ? "Exporting..." : "PDF"}</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all duration-200 flex items-center space-x-2"
                      title="Delete Note"
                    >
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
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
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
                <span>Created: {formatDate(note.createdAt)}</span>
              </div>
              {note.updatedAt && note.updatedAt !== note.createdAt && (
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Updated: {formatDate(note.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags Section */}
          {(isEditing || (note.tags && note.tags.length > 0)) && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Tags</h3>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={editedTags}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditedTags(val);
                      const { tags, invalid } = normalizeTagsString(val);
                      setParsedEditedTags(tags);
                      setEditedTagError(
                        invalid.length
                          ? `Invalid tags: ${invalid.join(", ")}`
                          : ""
                      );
                    }}
                    onBlur={(e) => {
                      const { cleanString, tags, invalid } =
                        normalizeTagsString(e.target.value);
                      setEditedTags(cleanString);
                      setParsedEditedTags(tags);
                      setEditedTagError(
                        invalid.length
                          ? `Invalid tags: ${invalid.join(", ")}`
                          : ""
                      );
                    }}
                    placeholder="#work #personal #important (separate with spaces)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />

                  {parsedEditedTags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {parsedEditedTags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {editedTagError && (
                    <p className="mt-2 text-sm text-red-600">
                      {editedTagError}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {note.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Content</h3>

            {isEditing && (
              <div className="border border-gray-300 rounded-t-md bg-gray-50 px-4 py-2 flex flex-wrap items-center gap-2 mb-0">
                {/* Bold */}
                <button
                  type="button"
                  onClick={() => formatText("bold")}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    activeFormats.bold
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-100 border"
                  }`}
                  title="Bold (Ctrl+B)"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M5 3h6a3 3 0 013 3v2a3 3 0 01-1.5 2.598A3 3 0 0114 13v2a3 3 0 01-3 3H5V3zm3 8V6h3a1 1 0 010 2H8zm0 5v-3h3.5a1 1 0 010 2H8z" />
                  </svg>
                </button>

                {/* Italic */}
                <button
                  type="button"
                  onClick={() => formatText("italic")}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    activeFormats.italic
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-100 border"
                  }`}
                  title="Italic (Ctrl+I)"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 3v1H8l2 12h2v1H6v-1h2L6 4H4V3h6z" />
                  </svg>
                </button>

                {/* Underline */}
                <button
                  type="button"
                  onClick={() => formatText("underline")}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    activeFormats.underline
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-100 border"
                  }`}
                  title="Underline (Ctrl+U)"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M5 3v8a5 5 0 0010 0V3h-2v8a3 3 0 01-6 0V3H5zm0 14h10v2H5v-2z" />
                  </svg>
                </button>

                <div className="w-px h-6 bg-gray-300 mx-1"></div>

                {/* Font Size */}
                <select
                  onChange={(e) => formatText("fontSize", e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Font Size"
                  defaultValue="3"
                >
                  <option value="1">Small</option>
                  <option value="3">Normal</option>
                  <option value="4">Medium</option>
                  <option value="5">Large</option>
                  <option value="6">X-Large</option>
                  <option value="7">XX-Large</option>
                </select>

                <div className="w-px h-6 bg-gray-300 mx-1"></div>

                {/* Text Color Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowColorPicker(!showColorPicker);
                      setShowHighlightPicker(false);
                      setShowListDropdown(false);
                    }}
                    className="p-2 rounded-md bg-white text-gray-700 hover:bg-gray-100 border transition-all duration-200 flex items-center"
                    title="Text Color"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    <svg
                      className="w-3 h-3 ml-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {showColorPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-3 w-48">
                      <div className="text-xs font-medium text-gray-700 mb-2">
                        Text Colors
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {textColors.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => {
                              formatText("foreColor", color.value);
                              setShowColorPicker(false);
                            }}
                            className="w-8 h-8 rounded-md border-2 border-gray-200 hover:border-gray-400 transition-all duration-200"
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Highlight Color Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHighlightPicker(!showHighlightPicker);
                      setShowColorPicker(false);
                      setShowListDropdown(false);
                    }}
                    className="p-2 rounded-md bg-white text-gray-700 hover:bg-gray-100 border transition-all duration-200 flex items-center"
                    title="Highlight Color"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 2a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h12v11H4V4z"
                        clipRule="evenodd"
                      />
                      <path d="M6 6h8v2H6V6zm0 4h8v2H6v-2z" />
                    </svg>
                    <svg
                      className="w-3 h-3 ml-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {showHighlightPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-3 w-48">
                      <div className="text-xs font-medium text-gray-700 mb-2">
                        Highlight Colors
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {highlightColors.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => {
                              formatText("backColor", color.value);
                              setShowHighlightPicker(false);
                            }}
                            className="w-8 h-8 rounded-md border-2 border-gray-200 hover:border-gray-400 transition-all duration-200 relative"
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          >
                            {color.value === "transparent" && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-6 h-0.5 bg-red-500 transform rotate-45"></div>
                                <div className="w-6 h-0.5 bg-red-500 transform -rotate-45 absolute"></div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-px h-6 bg-gray-300 mx-1"></div>

                {/* Lists Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowListDropdown(!showListDropdown);
                      setShowColorPicker(false);
                      setShowHighlightPicker(false);
                    }}
                    className="p-2 rounded-md bg-white text-gray-700 hover:bg-gray-100 border transition-all duration-200 flex items-center"
                    title="Insert List"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                    </svg>
                    <svg
                      className="w-3 h-3 ml-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {showListDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 py-1 w-48">
                      <button
                        type="button"
                        onClick={() => applyListStyle("none")}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-3 text-sm text-black ${
                          getCurrentListType() === null ? "bg-blue-100" : ""
                        }`}
                      >
                        <svg
                          className="w-4 h-4 text-black"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>None</span>
                      </button>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        type="button"
                        onClick={() => applyListStyle("bullet")}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-3 text-sm text-black ${
                          getCurrentListType() === "bullet" ? "bg-blue-100" : ""
                        }`}
                      >
                        <svg
                          className="w-4 h-4 text-black"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <circle cx="4" cy="10" r="2" />
                        </svg>
                        <span>Bullet List</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyListStyle("numbered")}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-3 text-sm text-black ${
                          getCurrentListType() === "numbered"
                            ? "bg-blue-100"
                            : ""
                        }`}
                      >
                        <span className="w-4 text-center font-semibold">
                          1.
                        </span>
                        <span>Numbered List</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyListStyle("lower-alpha")}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-3 text-sm text-black ${
                          getCurrentListType() === "lower-alpha"
                            ? "bg-blue-100"
                            : ""
                        }`}
                      >
                        <span className="w-4 text-center font-semibold">
                          a.
                        </span>
                        <span>Lowercase Letters</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyListStyle("upper-alpha")}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-3 text-sm text-black ${
                          getCurrentListType() === "upper-alpha"
                            ? "bg-blue-100"
                            : ""
                        }`}
                      >
                        <span className="w-4 text-center font-semibold">
                          A.
                        </span>
                        <span>Uppercase Letters</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="w-px h-6 bg-gray-300 mx-1"></div>

                {/* Insert Image */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2 rounded-md bg-white text-gray-700 hover:bg-gray-100 border transition-all duration-200"
                  title="Insert Image"
                >
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
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageInsert}
                  className="hidden"
                />

                <div className="w-px h-6 bg-gray-300 mx-1"></div>

                {/* Clear Formatting */}
                <button
                  type="button"
                  onClick={() => formatText("removeFormat")}
                  className="p-2 rounded-md bg-white text-gray-700 hover:bg-gray-100 border transition-all duration-200"
                  title="Clear Formatting"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            )}

            {isEditing ? (
              <div
                ref={contentEditRef}
                contentEditable
                className="w-full px-4 py-3 border border-gray-300 border-t-0 rounded-b-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                style={{
                  fontSize: "16px",
                  lineHeight: "1.6",
                  color: "#000000",
                  minHeight: "300px",
                }}
              />
            ) : (
              <div
                ref={noteContentRef}
                className="rich-text-content prose max-w-none"
                style={{
                  fontSize: "16px",
                  lineHeight: "1.6",
                  color: "#000000",
                  minHeight: "200px",
                }}
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            )}
          </div>

          {/* Attachments Section */}
          {note.attachments && note.attachments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                Attachments ({note.attachments.length})
              </h3>
              <div className="space-y-2">
                {note.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        if (attachment.downloadURL)
                          window.open(
                            attachment.downloadURL,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        else
                          alert(
                            "No file URL — this attachment was created before uploads were saved. Edit the note to reattach the file."
                          );
                      }
                    }}
                    onClick={() => {
                      if (attachment.downloadURL) {
                        window.open(
                          attachment.downloadURL,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      } else {
                        alert(
                          "No file URL — this attachment was created before uploads were saved. Edit the note to reattach the file."
                        );
                      }
                    }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                    title={
                      attachment.downloadURL ? "Open attachment" : "No file URL"
                    }
                  >
                    <div className="flex items-center space-x-3">
                      {attachment.type?.includes("image") ? (
                        <svg
                          className="w-6 h-6 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      ) : attachment.type?.includes("pdf") ? (
                        <svg
                          className="w-6 h-6 text-red-500"
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
                      ) : (
                        <svg
                          className="w-6 h-6 text-gray-500"
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
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {attachment.name}
                        </p>
                        {attachment.size && (
                          <p className="text-xs text-gray-500">
                            {(attachment.size / 1024).toFixed(2)} KB
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {attachment.downloadURL ? (
                        <a
                          href={attachment.downloadURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
                        >
                          Open
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          No file URL
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500 italic">
                Attachments are stored in Firebase Storage. Click Open to view or download a file.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default withAuth(NoteDetailPage);
