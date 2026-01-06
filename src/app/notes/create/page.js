"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateNote() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const contentRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: "",
  });

  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  // Color options for text and highlighting
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

  // Rich text editor functions
  const formatText = (command, value = null) => {
    // Ensure the content div has focus for commands to work
    if (contentRef.current) {
      contentRef.current.focus();
    }
    
    // Execute the formatting command
    const success = document.execCommand(command, false, value);
    
    // Special handling for list commands to ensure they work properly
    if ((command === 'insertUnorderedList' || command === 'insertOrderedList') && contentRef.current) {
      // If no text is selected and cursor is at the beginning, add some content first
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range.collapsed && contentRef.current.innerHTML.trim() === '') {
          contentRef.current.innerHTML = '<div><br></div>';
          // Place cursor in the div
          range.setStart(contentRef.current.firstChild, 0);
          range.setEnd(contentRef.current.firstChild, 0);
          selection.removeAllRanges();
          selection.addRange(range);
          // Execute command again
          document.execCommand(command, false, value);
        }
      }
    }
    
    updateActiveFormats();
    
    // Update form data with the new content
    if (contentRef.current) {
      setFormData((prev) => ({
        ...prev,
        content: contentRef.current.innerHTML,
      }));
    }
    
    return success;
  };

  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  };

  const handleContentChange = () => {
    if (contentRef.current) {
      setFormData((prev) => ({
        ...prev,
        content: contentRef.current.innerHTML,
      }));
    }
    updateActiveFormats();
  };

  const handleKeyDown = (e) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "b":
          e.preventDefault();
          formatText("bold");
          break;
        case "i":
          e.preventDefault();
          formatText("italic");
          break;
        case "u":
          e.preventDefault();
          formatText("underline");
          break;
        default:
          break;
      }
    }
  };

  const handleKeyUp = (e) => {
    updateActiveFormats();
  };

  const handleMouseUp = () => {
    updateActiveFormats();
  };

  useEffect(() => {
    // Set initial content
    if (contentRef.current && !formData.content) {
      contentRef.current.innerHTML = "";
    }

    // Close color pickers when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest(".color-picker-container")) {
        setShowColorPicker(false);
        setShowHighlightPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [formData.content]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileSelect = (files) => {
    const newAttachments = Array.from(files).map((file) => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.startsWith("image/")) {
      return (
        <svg
          className="w-6 h-6 text-green-500"
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
      );
    } else if (type.includes("pdf")) {
      return (
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
      );
    } else {
      return (
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Ensure we have the latest content from the editor
    const finalContent = contentRef.current
      ? contentRef.current.innerHTML
      : formData.content;

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In a real app, you would:
      // 1. Upload attachments to storage service
      // 2. Create note with metadata
      // 3. Handle authentication

      console.log("Note data:", {
        ...formData,
        content: finalContent, // Use the HTML content from the editor
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        attachments: attachments.map((att) => ({
          name: att.name,
          size: att.size,
          type: att.type,
        })),
      });

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error creating note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      {/* Header */}
      <header className="bg-white shadow-sm border-b animate-fade-in-down">
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
              <h1 className="text-2xl font-bold text-gray-900">
                Create New Note
              </h1>
            </div>
            <Link
              href="/"
              className="text-xl font-bold text-blue-600 hover:text-blue-800 transition-colors animate-pop-up"
            >
              NexoNotes
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Title */}
          <div className="bg-white rounded-lg shadow-sm p-6 animate-slide-up">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Note Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter a descriptive title for your note..."
              className="w-full px-3 py-2 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-black"
            />
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm p-6 animate-slide-up animation-delay-100">
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 mb-4"
            >
              Note Content
            </label>

            {/* Rich Text Editor Toolbar */}
            <div className="border border-gray-300 rounded-t-md bg-gray-50 px-4 py-2 flex flex-wrap items-center gap-2">
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
                className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-black"
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
              <div className="relative color-picker-container">
                <button
                  type="button"
                  onClick={() => {
                    setShowColorPicker(!showColorPicker);
                    setShowHighlightPicker(false);
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

                {/* Color Picker Dropdown */}
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
                          className="w-8 h-8 rounded-md border-2 border-gray-200 hover:border-gray-400 transition-all duration-200 flex items-center justify-center group"
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        >
                          {color.value === "#000000" && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Highlight Color Picker */}
              <div className="relative color-picker-container">
                <button
                  type="button"
                  onClick={() => {
                    setShowHighlightPicker(!showHighlightPicker);
                    setShowColorPicker(false);
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

                {/* Highlight Color Picker Dropdown */}
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
                          className="w-8 h-8 rounded-md border-2 border-gray-200 hover:border-gray-400 transition-all duration-200 flex items-center justify-center group relative"
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

              {/* Lists */}
              <button
                type="button"
                onClick={() => formatText("insertUnorderedList")}
                className="p-2 rounded-md bg-white text-gray-700 hover:bg-gray-100 border transition-all duration-200"
                title="Bullet List"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <circle cx="10" cy="5" r="2" />
                  <circle cx="10" cy="10" r="2" />
                  <circle cx="10" cy="15" r="2" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => formatText("insertOrderedList")}
                className="p-2 rounded-md bg-white text-gray-700 hover:bg-gray-100 border transition-all duration-200"
                title="Numbered List"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  {/* Simple digit 1 */}
                  <rect x="8" y="2" width="2" height="6" />
                  <rect x="7" y="2" width="2" height="1" />
                  <rect x="6" y="7" width="6" height="1" />

                  {/* Simple digit 2 */}
                  <rect x="4" y="11" width="8" height="1" />
                  <rect x="11" y="12" width="1" height="2" />
                  <rect x="4" y="14" width="8" height="1" />
                  <rect x="4" y="15" width="1" height="2" />
                  <rect x="4" y="16" width="8" height="1" />
                </svg>
              </button>

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

            {/* Rich Text Editor Content Area */}
            <div
              ref={contentRef}
              contentEditable
              onInput={handleContentChange}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onMouseUp={handleMouseUp}
              className="rich-text-editor w-full px-4 py-3 border border-gray-300 border-t-0 rounded-b-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              style={{
                fontSize: "16px",
                lineHeight: "1.6",
                color: "#000000",
              }}
              data-placeholder="Start writing your note content here..."
            />
          </div>

          {/* Tags */}
          <div className="bg-white rounded-lg shadow-sm p-6 animate-slide-up animation-delay-200">
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Tags (optional)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="work, personal, important (separate with commas)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-black"
            />
            <p className="mt-1 text-sm text-gray-500">
              Add tags to organize your notes. Separate multiple tags with
              commas.
            </p>
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-lg shadow-sm p-6 animate-slide-up animation-delay-300">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Attachments (optional)
            </label>

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">
                  {dragActive
                    ? "Drop files here"
                    : "Drop files here, or click to select"}
                </p>
                <p className="text-sm text-gray-500">
                  Upload images, PDFs, documents, and more
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:scale-105 transition-all duration-200"
                >
                  Select Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.svg"
                />
              </div>
            </div>

            {/* Attached Files */}
            {attachments.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Attached Files ({attachments.length})
                </h4>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {getFileIcon(attachment.type)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {attachment.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment.id)}
                        className="text-red-500 hover:text-red-700 hover:scale-110 transition-all duration-200"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 animate-slide-up animation-delay-400">
            <Link
              href="/dashboard"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:scale-105 transition-all duration-200"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !formData.title.trim() ||
                !formData.content.trim()
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Create Note
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
