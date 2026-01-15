"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotes } from "@/contexts/NotesContext";
import { useStorage } from "@/contexts/StorageContext";
import { withAuth } from "@/components/auth/ProtectedRoute";

function CreateNote() {
  const router = useRouter();
  const { user } = useAuth();
  const { createNote, loading: notesLoading } = useNotes();
  const { uploadMultipleFiles } = useStorage();
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
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
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [tagError, setTagError] = useState("");
  const [parsedTags, setParsedTags] = useState([]);

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
    if (
      (command === "insertUnorderedList" || command === "insertOrderedList") &&
      contentRef.current
    ) {
      // If no text is selected and cursor is at the beginning, add some content first
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range.collapsed && contentRef.current.innerHTML.trim() === "") {
          contentRef.current.innerHTML = "<div><br></div>";
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

    // Special handling for fontSize to apply to list items and markers
    if (command === "fontSize" && contentRef.current) {
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);

          // Get all list items that might be affected
          const listItems = new Set();

          // Check if we're in a list item
          let node = range.commonAncestorContainer;
          let current =
            node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

          while (current && current !== contentRef.current) {
            if (current.nodeName === "LI") {
              listItems.add(current);
              break;
            }
            current = current.parentElement;
          }

          // Also check for selected range
          const container = range.commonAncestorContainer;
          if (container.nodeType === Node.ELEMENT_NODE) {
            const selectedLis = container.querySelectorAll("li");
            selectedLis.forEach((li) => listItems.add(li));
          }

          // Apply font-size to li elements
          listItems.forEach((li) => {
            // Get all font elements inside
            const fontElements = li.querySelectorAll(
              'font[size], [style*="font-size"]'
            );
            if (fontElements.length > 0) {
              // Use the first one's font size
              const firstElement = fontElements[0];
              let fontSize = firstElement.style.fontSize;

              // Handle font size attribute
              if (!fontSize && firstElement.hasAttribute("size")) {
                const sizeAttr = firstElement.getAttribute("size");
                const sizeMap = {
                  1: "10px",
                  2: "13px",
                  3: "16px",
                  4: "18px",
                  5: "24px",
                  6: "32px",
                  7: "48px",
                };
                fontSize = sizeMap[sizeAttr] || "16px";
              }

              if (fontSize) {
                li.style.fontSize = fontSize;
              }
            }
          });
        }
      }, 50);
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

  const applyListStyle = (listType) => {
    const currentListType = getCurrentListType();

    // If clicking None, remove any list
    if (listType === "none") {
      if (currentListType === "bullet") {
        formatText("insertUnorderedList"); // Toggle off
      } else if (currentListType) {
        formatText("insertOrderedList"); // Toggle off
      }
      setShowListDropdown(false);
      return;
    }

    // If clicking same list type, toggle it off
    if (currentListType === listType) {
      if (listType === "bullet") {
        formatText("insertUnorderedList");
      } else {
        formatText("insertOrderedList");
      }
      setShowListDropdown(false);
      return;
    }

    // If switching from one list type to another, remove old first
    if (currentListType && currentListType !== listType) {
      if (currentListType === "bullet") {
        formatText("insertUnorderedList"); // Remove bullet
      } else {
        formatText("insertOrderedList"); // Remove ordered
      }
    }

    if (listType === "bullet") {
      formatText("insertUnorderedList");
      // Ensure bullet style
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          let node = selection.getRangeAt(0).commonAncestorContainer;
          let current =
            node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
          while (current && current !== contentRef.current) {
            if (current.nodeName === "UL") {
              current.style.listStyleType = "disc";
              break;
            }
            current = current.parentElement;
          }
        }
      }, 10);
    } else if (
      listType === "numbered" ||
      listType === "lower-alpha" ||
      listType === "upper-alpha"
    ) {
      formatText("insertOrderedList");
      // Apply the specific list style (use type attribute + listStyleType and update li markers)
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          let node = selection.getRangeAt(0).commonAncestorContainer;
          let current =
            node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
          while (current && current !== contentRef.current) {
            if (current.nodeName === "OL") {
              let styleType = "decimal";
              if (listType === "numbered") {
                styleType = "decimal";
                current.removeAttribute("type");
              } else if (listType === "lower-alpha") {
                styleType = "lower-alpha";
                current.setAttribute("type", "a");
              } else if (listType === "upper-alpha") {
                styleType = "upper-alpha";
                current.setAttribute("type", "A");
              }

              current.style.listStyleType = styleType;

              // Ensure each li uses the correct marker style
              current.querySelectorAll("li").forEach((li) => {
                li.style.listStyleType = styleType;
                li.style.display = "list-item";
              });

              break;
            }
            current = current.parentElement;
          }
        }
      }, 50);
    }
    setShowListDropdown(false);
  };

  const getCurrentListType = () => {
    if (!contentRef.current) return null;

    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      let node = selection.getRangeAt(0).commonAncestorContainer;
      let current =
        node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

      while (current && current !== contentRef.current) {
        if (current.nodeName === "UL") {
          return "bullet";
        }
        if (current.nodeName === "OL") {
          const computed = window.getComputedStyle(current);
          const listStyle = computed.listStyleType || "decimal";
          if (
            listStyle === "lower-alpha" ||
            current.getAttribute("type") === "a"
          )
            return "lower-alpha";
          if (
            listStyle === "upper-alpha" ||
            current.getAttribute("type") === "A"
          )
            return "upper-alpha";
          return "numbered";
        }
        current = current.parentElement;
      }
    }
    return null;
  };

  const handleEditorDoubleClick = (e) => {
    // Check if double-click is on a numbered list item or marker
    let target = e.target;
    let olElement = null;

    // Find parent ol element
    while (target && target !== contentRef.current) {
      if (target.nodeName === "OL") {
        olElement = target;
        break;
      }
      if (target.nodeName === "LI" && target.parentElement?.nodeName === "OL") {
        olElement = target.parentElement;
        break;
      }
      target = target.parentElement;
    }

    if (olElement) {
      e.preventDefault();
      e.stopPropagation();

      const currentStart = olElement.getAttribute("start") || "1";

      // Create inline input
      const input = document.createElement("input");
      input.type = "text";
      input.value = currentStart;
      input.style.cssText =
        "position: absolute; width: 50px; padding: 6px 8px; border: 2px solid #2563eb; border-radius: 4px; font-size: 14px; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.15); text-align: center; color: #000000; background: white;";

      // Position near the clicked list item
      const rect = olElement.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;
      input.style.left = rect.left + scrollLeft - 60 + "px";
      input.style.top = rect.top + scrollTop + "px";

      document.body.appendChild(input);
      input.focus();
      input.select();

      const applyValue = () => {
        const newValue = parseInt(input.value);
        if (!isNaN(newValue) && newValue > 0) {
          olElement.setAttribute("start", newValue);
          setFormData((prev) => ({
            ...prev,
            content: contentRef.current.innerHTML,
          }));
        }
        input.remove();
      };

      input.addEventListener("blur", applyValue);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          applyValue();
        } else if (event.key === "Escape") {
          input.remove();
        }
      });
    }
  };

  const createResizableImage = (imageSrc) => {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    wrapper.style.maxWidth = "100%";
    wrapper.style.margin = "10px 0";
    wrapper.style.border = "2px solid transparent";
    wrapper.style.padding = "2px";
    wrapper.className = "image-wrapper";
    wrapper.contentEditable = "false";
    wrapper.tabIndex = "0"; // Make wrapper focusable

    const img = document.createElement("img");
    img.src = imageSrc;
    img.style.width = "400px";
    img.style.height = "auto";
    img.style.borderRadius = "8px";
    img.style.display = "block";
    img.style.cursor = "move";
    img.draggable = false;

    // Create resize handles (corners and edges)
    const handles = ["nw", "ne", "sw", "se", "n", "s", "e", "w"];
    const handleElements = {};

    handles.forEach((position) => {
      const handle = document.createElement("div");
      handle.className = `resize-handle-${position}`;
      handle.style.position = "absolute";
      handle.style.background = "rgba(37, 99, 235, 0.9)";
      handle.style.border = "2px solid white";
      handle.style.display = "none";
      handle.style.zIndex = "10";
      handle.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      handle.style.transition = "all 0.2s ease";

      // Position and cursor based on handle type
      if (position.includes("n")) handle.style.top = "-6px";
      if (position.includes("s")) handle.style.bottom = "-6px";
      if (position.includes("w")) handle.style.left = "-6px";
      if (position.includes("e")) handle.style.right = "-6px";

      if (position === "n" || position === "s") {
        handle.style.width = "40px";
        handle.style.height = "8px";
        handle.style.left = "50%";
        handle.style.transform = "translateX(-50%)";
        handle.style.cursor = "ns-resize";
        handle.style.borderRadius = "4px";
      } else if (position === "e" || position === "w") {
        handle.style.width = "8px";
        handle.style.height = "40px";
        handle.style.top = "50%";
        handle.style.transform = "translateY(-50%)";
        handle.style.cursor = "ew-resize";
        handle.style.borderRadius = "4px";
      } else {
        // Corner handles - make them more prominent
        handle.style.width = "14px";
        handle.style.height = "14px";
        handle.style.borderRadius = "50%";
        handle.style.cursor = `${position}-resize`;
      }

      // Hover effect on handles
      handle.addEventListener("mouseenter", () => {
        handle.style.transform =
          position === "n" || position === "s"
            ? "translateX(-50%) scale(1.2)"
            : position === "e" || position === "w"
            ? "translateY(-50%) scale(1.2)"
            : "scale(1.3)";
        handle.style.background = "rgba(37, 99, 235, 1)";
      });

      handle.addEventListener("mouseleave", () => {
        if (!wrapper.dataset.resizing) {
          handle.style.transform =
            position === "n" || position === "s"
              ? "translateX(-50%)"
              : position === "e" || position === "w"
              ? "translateY(-50%)"
              : "";
          handle.style.background = "rgba(37, 99, 235, 0.9)";
        }
      });

      handleElements[position] = handle;
      wrapper.appendChild(handle);
    });

    // Show/hide handles and border on hover
    wrapper.addEventListener("mouseenter", () => {
      wrapper.style.border = "2px solid rgba(37, 99, 235, 0.5)";
      Object.values(handleElements).forEach((h) => (h.style.display = "block"));
    });

    wrapper.addEventListener("mouseleave", () => {
      if (!wrapper.dataset.resizing) {
        wrapper.style.border = "2px solid transparent";
        Object.values(handleElements).forEach(
          (h) => (h.style.display = "none")
        );
      }
    });

    // Resize functionality for all handles
    Object.entries(handleElements).forEach(([position, handle]) => {
      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        wrapper.dataset.resizing = "true";

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = img.offsetWidth;
        const startHeight = img.offsetHeight;
        const aspectRatio = startWidth / startHeight;

        const onMouseMove = (e) => {
          let newWidth = startWidth;
          let newHeight = startHeight;

          if (position.includes("e")) {
            newWidth = startWidth + (e.clientX - startX);
          } else if (position.includes("w")) {
            newWidth = startWidth - (e.clientX - startX);
          }

          if (position.includes("s")) {
            newHeight = startHeight + (e.clientY - startY);
          } else if (position.includes("n")) {
            newHeight = startHeight - (e.clientY - startY);
          }

          // Maintain aspect ratio for corner handles
          if (position.length === 2) {
            if (Math.abs(e.clientX - startX) > Math.abs(e.clientY - startY)) {
              newHeight = newWidth / aspectRatio;
            } else {
              newWidth = newHeight * aspectRatio;
            }
          } else if (position === "e" || position === "w") {
            newHeight = newWidth / aspectRatio;
          } else if (position === "n" || position === "s") {
            newWidth = newHeight * aspectRatio;
          }

          // Apply constraints
          if (
            newWidth >= 100 &&
            newWidth <= contentRef.current.offsetWidth - 20
          ) {
            img.style.width = newWidth + "px";
            img.style.height = "auto";
          }
        };

        const onMouseUp = () => {
          delete wrapper.dataset.resizing;
          wrapper.style.border = "2px solid transparent";
          Object.values(handleElements).forEach(
            (h) => (h.style.display = "none")
          );
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);

          // Update form data
          if (contentRef.current) {
            setFormData((prev) => ({
              ...prev,
              content: contentRef.current.innerHTML,
            }));
          }
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    });

    // Drag-to-reposition functionality (row and column wise)
    let isDragging = false;
    let dragStartX, dragStartY;
    let dragThreshold = 5; // pixels to move before initiating drag
    let dropIndicator = null;

    img.addEventListener("mousedown", (e) => {
      // Don't interfere with resize handles
      if (e.target.classList.contains("resize-handle")) return;

      e.preventDefault();
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      const onMouseMove = (moveEvent) => {
        const deltaX = Math.abs(moveEvent.clientX - dragStartX);
        const deltaY = Math.abs(moveEvent.clientY - dragStartY);

        // Start dragging if moved beyond threshold
        if (!isDragging && (deltaX > dragThreshold || deltaY > dragThreshold)) {
          isDragging = true;
          wrapper.style.opacity = "0.5";
          wrapper.style.cursor = "grabbing";
          wrapper.style.pointerEvents = "none"; // Allow mouse to pass through during drag

          // Create drop indicator (cursor-like vertical line)
          dropIndicator = document.createElement("span");
          dropIndicator.style.position = "absolute";
          dropIndicator.style.width = "2px";
          dropIndicator.style.height = "20px";
          dropIndicator.style.backgroundColor = "rgba(37, 99, 235, 0.9)";
          dropIndicator.style.boxShadow = "0 0 8px rgba(37, 99, 235, 0.5)";
          dropIndicator.style.pointerEvents = "none";
          dropIndicator.style.zIndex = "1000";
          document.body.appendChild(dropIndicator);
        }

        if (isDragging && contentRef.current && dropIndicator) {
          // Position drop indicator at mouse cursor
          dropIndicator.style.left = moveEvent.clientX + "px";
          dropIndicator.style.top = moveEvent.clientY + "px";
        }
      };

      const onMouseUp = (upEvent) => {
        if (isDragging && contentRef.current) {
          // Get the exact position where mouse was released (cross-browser)
          let range;

          if (document.caretRangeFromPoint) {
            // Chrome, Safari
            range = document.caretRangeFromPoint(
              upEvent.clientX,
              upEvent.clientY
            );
          } else if (document.caretPositionFromPoint) {
            // Firefox
            const position = document.caretPositionFromPoint(
              upEvent.clientX,
              upEvent.clientY
            );
            if (position) {
              range = document.createRange();
              range.setStart(position.offsetNode, position.offset);
              range.collapse(true);
            }
          }

          if (range) {
            // Remove wrapper from current position
            const parent = wrapper.parentNode;
            if (parent) {
              wrapper.remove();
            }

            // Insert at new position
            try {
              range.insertNode(wrapper);

              // Add space after if needed
              if (
                !wrapper.nextSibling ||
                wrapper.nextSibling.nodeType !== Node.TEXT_NODE
              ) {
                const space = document.createTextNode("\u00A0");
                wrapper.parentNode.insertBefore(space, wrapper.nextSibling);
              }

              // Update form data
              setFormData((prev) => ({
                ...prev,
                content: contentRef.current.innerHTML,
              }));
            } catch (error) {
              // Fallback: append to editor if insertion fails
              contentRef.current.appendChild(wrapper);
            }
          }
        }

        // Cleanup
        if (dropIndicator && dropIndicator.parentNode) {
          dropIndicator.remove();
        }
        wrapper.style.opacity = "1";
        wrapper.style.cursor = "";
        wrapper.style.pointerEvents = "";
        isDragging = false;
        dropIndicator = null;

        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    img.style.cursor = "grab";

    // Click to select image
    wrapper.addEventListener("click", (e) => {
      e.stopPropagation();
      wrapper.focus();
      wrapper.style.border = "2px solid rgba(37, 99, 235, 0.8)";
      wrapper.style.outline = "none";
    });

    // Handle focus/blur for selection visual feedback
    wrapper.addEventListener("focus", () => {
      wrapper.style.border = "2px solid rgba(37, 99, 235, 0.8)";
      Object.values(handleElements).forEach((h) => (h.style.display = "block"));
    });

    wrapper.addEventListener("blur", () => {
      if (!wrapper.dataset.resizing) {
        wrapper.style.border = "2px solid transparent";
        Object.values(handleElements).forEach(
          (h) => (h.style.display = "none")
        );
      }
    });

    // Delete image on Delete or Backspace key
    wrapper.addEventListener("keydown", (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        wrapper.remove();

        // Update form data
        if (contentRef.current) {
          setFormData((prev) => ({
            ...prev,
            content: contentRef.current.innerHTML,
          }));
        }
      }
    });

    wrapper.appendChild(img);
    return wrapper;
  };

  const insertImageIntoEditor = (imageSrc) => {
    if (!contentRef.current) return;

    const wrapper = createResizableImage(imageSrc);

    contentRef.current.focus();
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(wrapper);

      // Add a line break after image wrapper
      const br = document.createElement("br");
      wrapper.parentNode.insertBefore(br, wrapper.nextSibling);

      // Update form data
      setFormData((prev) => ({
        ...prev,
        content: contentRef.current.innerHTML,
      }));
    }
  };

  const handleImageInsert = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      insertImageIntoEditor(event.target.result);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = "";
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            insertImageIntoEditor(event.target.result);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const handleEditorDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (contentRef.current) {
      contentRef.current.style.borderColor = "rgba(37, 99, 235, 0.5)";
    }
  };

  const handleEditorDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (contentRef.current) {
      contentRef.current.style.borderColor = "";
    }
  };

  const handleEditorDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (contentRef.current) {
      contentRef.current.style.borderColor = "";
    }

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          insertImageIntoEditor(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleContentChange = () => {
    if (contentRef.current) {
      setFormData((prev) => ({
        ...prev,
        content: contentRef.current.innerHTML,
      }));

      // Make list items draggable
      const listItems = contentRef.current.querySelectorAll("li");
      listItems.forEach((li) => {
        if (!li.hasAttribute("draggable")) {
          li.setAttribute("draggable", "true");
          li.style.cursor = "move";

          li.addEventListener("dragstart", handleListItemDragStart);
          li.addEventListener("dragover", handleListItemDragOver);
          li.addEventListener("drop", handleListItemDrop);
          li.addEventListener("dragend", handleListItemDragEnd);
          li.addEventListener("dragleave", handleListItemDragLeave);
        }
      });
    }
    updateActiveFormats();
  };

  let draggedListItem = null;

  const handleListItemDragStart = (e) => {
    draggedListItem = e.currentTarget;
    e.currentTarget.style.opacity = "0.5";
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget.innerHTML);
  };

  const handleListItemDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const targetLi = e.currentTarget;
    if (
      targetLi &&
      targetLi !== draggedListItem &&
      targetLi.nodeName === "LI"
    ) {
      targetLi.style.borderTop = "2px solid #2563eb";
    }
  };

  const handleListItemDragLeave = (e) => {
    const targetLi = e.currentTarget;
    if (targetLi && targetLi.nodeName === "LI") {
      targetLi.style.borderTop = "";
    }
  };

  const handleListItemDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const targetLi = e.currentTarget;
    targetLi.style.borderTop = "";

    if (
      draggedListItem &&
      targetLi &&
      targetLi !== draggedListItem &&
      targetLi.nodeName === "LI"
    ) {
      const parent = targetLi.parentNode;

      // Insert dragged item before target
      parent.insertBefore(draggedListItem, targetLi);

      // Update form data
      setFormData((prev) => ({
        ...prev,
        content: contentRef.current.innerHTML,
      }));
    }
  };

  const handleListItemDragEnd = (e) => {
    e.currentTarget.style.opacity = "1";

    // Clear all border indicators
    if (contentRef.current) {
      const allListItems = contentRef.current.querySelectorAll("li");
      allListItems.forEach((li) => {
        li.style.borderTop = "";
      });
    }

    draggedListItem = null;
  };

  const handleKeyDown = (e) => {
    // Handle image deletion
    const selection = window.getSelection();
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      selection.rangeCount > 0
    ) {
      const range = selection.getRangeAt(0);
      const node = range.startContainer;

      // Check if we're at an image wrapper or its parent
      let imageWrapper = null;

      // Check if node is the wrapper itself
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        node.classList?.contains("image-wrapper")
      ) {
        imageWrapper = node;
      }
      // Check if parent is the wrapper
      else if (node.parentElement?.classList?.contains("image-wrapper")) {
        imageWrapper = node.parentElement;
      }
      // Check if any ancestor is the wrapper
      else {
        let current =
          node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        while (current && current !== contentRef.current) {
          if (current.classList?.contains("image-wrapper")) {
            imageWrapper = current;
            break;
          }
          current = current.parentElement;
        }
      }

      // Also check if cursor is right before/after an image wrapper
      if (!imageWrapper) {
        if (e.key === "Delete") {
          // Check next sibling
          const nextNode = range.endContainer.childNodes?.[range.endOffset];
          if (nextNode?.classList?.contains("image-wrapper")) {
            imageWrapper = nextNode;
          }
        } else if (e.key === "Backspace") {
          // Check previous sibling
          const prevNode =
            range.startContainer.childNodes?.[range.startOffset - 1];
          if (prevNode?.classList?.contains("image-wrapper")) {
            imageWrapper = prevNode;
          }
        }
      }

      if (imageWrapper) {
        e.preventDefault();
        imageWrapper.remove();

        // Update form data
        setFormData((prev) => ({
          ...prev,
          content: contentRef.current.innerHTML,
        }));
        return;
      }
    }

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
      if (!event.target.closest(".list-dropdown-container")) {
        setShowListDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    // Warn before leaving page if there's unsaved content
    const handleBeforeUnload = (e) => {
      const hasContent =
        formData.title.trim() ||
        (contentRef.current && contentRef.current.textContent.trim()) ||
        attachments.length > 0;

      if (hasContent && !isSubmitting) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [formData.title, formData.content, attachments, isSubmitting]);

  const normalizeTagsString = (str) => {
    if (!str) return { cleanString: "", tags: [], invalid: [] };

    // Replace commas with spaces and split by whitespace
    const tokens = str.replace(/,/g, " ").trim().split(/\s+/);
    const validRegex = /^#[A-Za-z0-9_]+$/;

    const tags = [];
    const invalid = [];

    tokens.forEach((t) => {
      if (!t) return;
      let token = t.trim();

      // Ensure it starts with #
      if (!token.startsWith("#")) token = `#${token}`;

      // Remove any unexpected characters except #, letters, numbers and underscore
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

  const handleTagsBlur = (e) => {
    const { cleanString, tags, invalid } = normalizeTagsString(e.target.value);
    setFormData((prev) => ({ ...prev, tags: cleanString }));
    setParsedTags(tags);
    setTagError(invalid.length ? `Invalid tags: ${invalid.join(", ")}` : "");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "tags") {
      const { tags, invalid } = normalizeTagsString(value);
      setParsedTags(tags);
      setTagError(invalid.length ? `Invalid tags: ${invalid.join(", ")}` : "");
    }

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
      // Validate required fields
      if (!formData.title.trim()) {
        alert("Please enter a title for your note");
        setIsSubmitting(false);
        return;
      }

      // Prepare note data
      const { tags: finalTags, invalid } = normalizeTagsString(formData.tags);
      if (invalid.length) {
        alert(`Invalid tags: ${invalid.join(", ")}`);
        setIsSubmitting(false);
        return;
      }

      // Upload attachments (if any) and collect upload metadata
      let uploadedAttachments = [];

      if (attachments.length > 0) {
        try {
          // Use StorageContext helper to upload multiple files
          const files = attachments.map((att) => att.file);
          const uploadPath = `users/${user.uid}/notes/${Date.now()}`;

          const results = await uploadMultipleFiles(
            files,
            uploadPath,
            (index, progress) => {
              // Optionally you could update local attachment progress state here
              // setAttachments(prev => prev.map((a,i)=> i===index ? { ...a, progress } : a));
            }
          );

          uploadedAttachments = results.map((res, idx) => ({
            name: attachments[idx].name,
            size: res.size || attachments[idx].size,
            type: res.type || attachments[idx].type,
            downloadURL: res.downloadURL,
            fullPath: res.fullPath,
          }));
        } catch (err) {
          console.error("Attachment upload error:", err);
          alert("Failed to upload attachments: " + (err.message || err));
          setIsSubmitting(false);
          return;
        }
      }

      const noteData = {
        title: formData.title.trim(),
        content: finalContent,
        tags: finalTags.map((tag) => tag.replace(/^#/, "")),
        attachments: uploadedAttachments,
      };

      // Create note in Firebase
      await createNote(noteData);

      console.log("Note created successfully!");

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error creating note:", error);
      alert("Failed to create note. Please try again.");
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

              {/* Lists Dropdown */}
              <div className="relative list-dropdown-container">
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

                {/* List Dropdown Menu */}
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
                        getCurrentListType() === "numbered" ? "bg-blue-100" : ""
                      }`}
                    >
                      <span className="w-4 text-center font-semibold">1.</span>
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
                      <span className="w-4 text-center font-semibold">a.</span>
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
                      <span className="w-4 text-center font-semibold">A.</span>
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

            {/* Rich Text Editor Content Area */}
            <div
              ref={contentRef}
              contentEditable
              onInput={handleContentChange}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onMouseUp={handleMouseUp}
              onPaste={handlePaste}
              onDragOver={handleEditorDragOver}
              onDragLeave={handleEditorDragLeave}
              onDrop={handleEditorDrop}
              onDoubleClick={handleEditorDoubleClick}
              className="rich-text-editor w-full px-4 py-3 border border-gray-300 border-t-0 rounded-b-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              style={{
                fontSize: "16px",
                lineHeight: "1.6",
                color: "#000000",
              }}
              data-placeholder="Start writing your note content here... (You can paste or drag & drop images, double-click numbered lists to change start number)"
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
              onBlur={handleTagsBlur}
              placeholder="#work #personal #important (separate with spaces)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-black"
            />
            <p className="mt-1 text-sm text-gray-500">
              Rules: each tag must start with a <code>#</code>, tags separated
              by a space, no spaces inside a tag, underscores (_) allowed, and
              tags must be unique.
            </p>

            {/* Parsed tags preview */}
            {parsedTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {parsedTags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Error */}
            {tagError && (
              <p className="mt-2 text-sm text-red-600">{tagError}</p>
            )}
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

export default withAuth(CreateNote);
