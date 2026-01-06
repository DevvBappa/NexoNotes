"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import html2pdf from "html2pdf.js";

// Mock note data - in real app, this would come from API
const mockNotes = {
  1: {
    id: "1",
    title: "Meeting Notes - Q4 Planning",
    content: `# Q4 Planning Meeting

## Attendees
- User (Product Manager)
- Jane Smith (Engineering Lead)
- Mike Johnson (Designer)
- Sarah Wilson (Marketing)

## Agenda
1. Review Q3 performance
2. Set Q4 objectives
3. Resource allocation
4. Timeline discussion

## Key Points Discussed

### Q3 Performance Review
- Successfully launched 3 major features
- User engagement increased by 25%
- Technical debt reduced by 40%
- Customer satisfaction score: 4.2/5

### Q4 Objectives
1. **Product Goals**
   - Launch mobile app
   - Implement advanced search functionality
   - Add collaboration features
   
2. **Technical Goals**
   - Migrate to microservices architecture
   - Improve API performance by 30%
   - Implement automated testing pipeline

3. **Business Goals**
   - Increase user base by 50%
   - Achieve 95% uptime
   - Launch in 2 new markets

## Action Items
- [ ] Create detailed project timeline (Due: Aug 25)
- [ ] Allocate development resources (Due: Aug 27)
- [ ] Begin market research for new regions (Due: Sep 1)
- [ ] Design mobile app mockups (Due: Sep 5)

## Next Meeting
**Date:** September 1st, 2024  
**Time:** 2:00 PM EST  
**Location:** Conference Room A / Zoom`,
    tags: ["work", "planning", "q4", "meeting"],
    createdAt: "2024-08-20T10:30:00Z",
    updatedAt: "2024-08-20T15:45:00Z",
    attachments: [
      {
        id: "att-1",
        name: "Q3_Performance_Report.pdf",
        size: 2485760,
        type: "application/pdf",
        url: "#",
      },
      {
        id: "att-2",
        name: "Market_Research_Data.xlsx",
        size: 1024000,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        url: "#",
      },
    ],
  },
  2: {
    id: "2",
    title: "Personal Todo List",
    content: `# Personal Todo List

## Today's Priority Tasks
1. **Buy groceries**
   - Milk
   - Bread
   - Eggs
   - Fruits (apples, bananas)
   - Vegetables (carrots, spinach)

2. **Call dentist**
   - Schedule routine cleaning
   - Ask about whitening options
   - Confirm insurance coverage

3. **Finish project proposal**
   - Review requirements
   - Add budget section
   - Include timeline
   - Proofread and format

## This Week
- [ ] Car maintenance appointment
- [ ] Update resume
- [ ] Plan weekend trip
- [ ] Organize home office
- [ ] Read 2 chapters of current book

## Monthly Goals
- Exercise 3x per week
- Save $500
- Learn a new skill online
- Deep clean the house
- Plan vacation for next quarter`,
    tags: ["personal", "todo", "goals"],
    createdAt: "2024-08-19T09:15:00Z",
    updatedAt: "2024-08-21T14:22:00Z",
    attachments: [],
  },
  3: {
    id: "3",
    title: "Book Summary: Atomic Habits",
    content: `# Atomic Habits by James Clear

## Key Takeaways

### The Four Laws of Behavior Change

1. **Make it Obvious**
   - Design your environment for success
   - Use implementation intentions ("I will do X at time Y in location Z")
   - Stack habits ("After I do X, I will do Y")

2. **Make it Attractive**
   - Bundle habits with activities you enjoy
   - Join a culture where your desired behavior is normal
   - Use temptation bundling

3. **Make it Easy**
   - Reduce friction for good habits
   - Increase friction for bad habits
   - Use the Two-Minute Rule
   - Prepare your environment for success

4. **Make it Satisfying**
   - Use immediate rewards
   - Track your habits
   - Never miss twice

### Important Concepts

**1% Better Every Day**
> "If you can get 1 percent better each day for one year, you'll end up thirty-seven times better by the time you're done."

**Identity-Based Habits**
- Focus on who you want to become, not what you want to achieve
- Every action is a vote for the type of person you wish to become

**The Plateau of Latent Potential**
- Habits often appear to make no difference until you cross a critical threshold
- Success is often delayed, but not absent

### Practical Applications
1. Start with 2-minute habits
2. Design your environment
3. Use habit stacking
4. Track your progress
5. Focus on systems, not goals

### Favorite Quotes
- "You do not rise to the level of your goals; you fall to the level of your systems."
- "Every action you take is a vote for the type of person you wish to become."
- "The most effective way to change your habits is to focus not on what you want to achieve, but on who you wish to become."`,
    tags: ["books", "self-improvement", "habits", "productivity"],
    createdAt: "2024-08-18T20:10:00Z",
    updatedAt: "2024-08-18T20:10:00Z",
    attachments: [
      {
        id: "att-3",
        name: "atomic-habits-summary.png",
        size: 1536000,
        type: "image/png",
        url: "#",
      },
    ],
  },
};

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const noteContentRef = useRef(null);
  const [note, setNote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    if (!noteContentRef.current || !note) return;
    
    setIsExporting(true);
    
    try {
      const element = noteContentRef.current;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    // Simulate API call
    const fetchNote = async () => {
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
        const noteData = mockNotes[params.id];
        if (noteData) {
          setNote(noteData);
        } else {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching note:", error);
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchNote();
    }
  }, [params.id, router]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
          className="w-5 h-5 text-green-500"
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
          className="w-5 h-5 text-red-500"
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
    } else if (type.includes("spreadsheet") || type.includes("excel")) {
      return (
        <svg
          className="w-5 h-5 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="w-5 h-5 text-blue-500"
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

  const renderContent = (content) => {
    // Simple markdown-like rendering for demo purposes
    return content.split("\n").map((line, index) => {
      if (line.startsWith("# ")) {
        return (
          <h1
            key={index}
            className="text-3xl font-bold text-gray-900 mb-4 mt-6"
          >
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith("## ")) {
        return (
          <h2
            key={index}
            className="text-2xl font-semibold text-gray-800 mb-3 mt-5"
          >
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        return (
          <h3
            key={index}
            className="text-xl font-medium text-gray-700 mb-2 mt-4"
          >
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith("- [ ]")) {
        return (
          <div key={index} className="flex items-center mb-1">
            <input
              type="checkbox"
              className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <span className="text-gray-700">{line.slice(5)}</span>
          </div>
        );
      } else if (line.startsWith("- [x]")) {
        return (
          <div key={index} className="flex items-center mb-1">
            <input
              type="checkbox"
              checked
              className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <span className="text-gray-700 line-through">{line.slice(5)}</span>
          </div>
        );
      } else if (line.startsWith("- ")) {
        return (
          <li key={index} className="text-gray-700 mb-1">
            {line.slice(2)}
          </li>
        );
      } else if (line.match(/^\d+\./)) {
        return (
          <li
            key={index}
            className="text-gray-700 mb-1 list-decimal list-inside"
          >
            {line}
          </li>
        );
      } else if (line.startsWith(">")) {
        return (
          <blockquote
            key={index}
            className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4"
          >
            {line.slice(1).trim()}
          </blockquote>
        );
      } else if (line.trim() === "") {
        return <br key={index} />;
      } else {
        return (
          <p key={index} className="text-gray-700 mb-2">
            {line}
          </p>
        );
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center glass-effect rounded-2xl p-12 max-w-md mx-auto shadow-elevation-3">
          <div className="float-animation mb-6">
            <svg
              className="animate-spin h-12 w-12 text-blue-600 mx-auto"
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
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading your note...
          </h2>
          <p className="text-gray-600">
            Please wait while we fetch your content.
          </p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center glass-effect rounded-2xl p-12 max-w-md mx-auto shadow-elevation-3">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-red-400 float-animation"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Note not found
          </h2>
          <p className="text-gray-600 mb-6">
            The note you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Link
            href="/dashboard"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 animate-fade-in">
      {/* Header */}
      <header className="glass-effect shadow-elevation-2 border-b animate-fade-in-down sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-blue-600 hover:scale-110 transition-all duration-200 micro-interaction p-2 rounded-lg hover:bg-blue-50"
                title="Back to Dashboard"
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
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full pulse-animation"></div>
                <h1 className="text-xl font-semibold text-gradient truncate max-w-md text-shadow-soft">
                  {note.title}
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportToPDF}
                disabled={isExporting}
                className="p-2 rounded-lg transition-all duration-200 micro-interaction text-gray-600 hover:text-green-600 hover:bg-green-50 disabled:opacity-50"
                title="Export as PDF"
              >
                {isExporting ? (
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    stroke="currentColor"
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
                ) : (
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded-lg transition-all duration-200 micro-interaction ${
                  isEditing
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                }`}
                title="Edit note"
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <Link
                href="/"
                className="text-xl font-bold text-gradient hover:scale-105 transition-all duration-300 animate-pop-up text-shadow-soft"
              >
                NexoNotes
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8" ref={noteContentRef}>
          {/* Note Metadata */}
          <div className="gradient-border animate-slide-up">
            <div className="gradient-border-inner">
              <div className="flex flex-wrap items-center justify-between">
                <div className="flex flex-wrap gap-3 mb-4 md:mb-0">
                  {note.tags.map((tag, index) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 hover:from-blue-200 hover:to-purple-200 transition-all duration-200 micro-interaction"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-gray-500 space-y-1 bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    <span>Created: {formatDate(note.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4 text-blue-500"
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
                </div>
              </div>
            </div>
          </div>

          {/* Note Content */}
          <div className="dashboard-card animate-slide-up animation-delay-100">
            <div className="p-8">
              <div className="prose prose-lg max-w-none">
                <div className="text-shadow-soft">
                  {renderContent(note.content)}
                </div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {note.attachments && note.attachments.length > 0 && (
            <div className="dashboard-card animate-slide-up animation-delay-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gradient mb-6 flex items-center space-x-2 text-shadow-soft">
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
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  <span>Attachments ({note.attachments.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {note.attachments.map((attachment, index) => (
                    <div
                      key={attachment.id}
                      className="glass-effect rounded-xl p-4 hover:shadow-elevation-2 transition-all duration-300 micro-interaction group"
                      style={{ animationDelay: `${index * 100 + 300}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {getFileIcon(attachment.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.size)}
                            </p>
                          </div>
                        </div>
                        <a
                          href={attachment.url}
                          className="flex-shrink-0 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 micro-interaction"
                          title="Download file"
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
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-8 right-8 flex flex-col space-y-4 z-40">
          <Link
            href="/notes/create"
            className="btn-primary-enhanced w-14 h-14 rounded-full flex items-center justify-center shadow-elevation-4 hover:shadow-elevation-4 float-animation"
            title="Create new note"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </Link>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-12 h-12 bg-white/80 backdrop-blur-sm text-gray-600 hover:text-blue-600 rounded-full flex items-center justify-center shadow-elevation-2 hover:shadow-elevation-3 transition-all duration-300 micro-interaction border border-white/30"
            title="Scroll to top"
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
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
}

