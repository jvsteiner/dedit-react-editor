import { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";

interface FindReplaceBarProps {
  editor: Editor;
  onClose: () => void;
}

export function FindReplaceBar({ editor, onClose }: FindReplaceBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get results from editor storage
  const results = editor.storage.searchAndReplace?.results || [];
  const resultIndex = editor.storage.searchAndReplace?.resultIndex || 0;

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Update editor when search term changes
  useEffect(() => {
    editor.commands.setSearchTerm(searchTerm);
  }, [editor, searchTerm]);

  // Update editor when replace term changes
  useEffect(() => {
    editor.commands.setReplaceTerm(replaceTerm);
  }, [editor, replaceTerm]);

  // Update editor when case sensitivity changes
  useEffect(() => {
    editor.commands.setCaseSensitive(caseSensitive);
  }, [editor, caseSensitive]);

  // Scroll to current result when it changes
  useEffect(() => {
    if (results.length > 0 && resultIndex >= 0 && resultIndex < results.length) {
      const result = results[resultIndex];
      // Use TipTap's scrollIntoView
      editor.commands.setTextSelection(result.from);

      // Find the decoration element and scroll to it
      setTimeout(() => {
        const currentHighlight = document.querySelector(".search-result-current");
        if (currentHighlight) {
          currentHighlight.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 10);
    }
  }, [editor, results, resultIndex]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    editor.commands.resetIndex();
  }, [editor]);

  const handleReplaceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setReplaceTerm(e.target.value);
  }, []);

  const handlePrevious = useCallback(() => {
    editor.commands.previousSearchResult();
    // Force re-render to get updated index
    editor.view.dispatch(editor.state.tr);
  }, [editor]);

  const handleNext = useCallback(() => {
    editor.commands.nextSearchResult();
    // Force re-render to get updated index
    editor.view.dispatch(editor.state.tr);
  }, [editor]);

  const handleReplace = useCallback(() => {
    if (results.length === 0) return;
    editor.commands.replace();
    // Move to next result after replace
    editor.commands.nextSearchResult();
    editor.view.dispatch(editor.state.tr);
  }, [editor, results.length]);

  const handleReplaceAll = useCallback(() => {
    if (results.length === 0) return;
    editor.commands.replaceAll();
  }, [editor, results.length]);

  const toggleCaseSensitive = useCallback(() => {
    setCaseSensitive((prev) => !prev);
    editor.commands.resetIndex();
  }, [editor]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter") {
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
      e.preventDefault();
    } else if (e.key === "F3") {
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
      e.preventDefault();
    }
  }, [onClose, handlePrevious, handleNext]);

  // Clear search when closing
  useEffect(() => {
    return () => {
      editor.commands.setSearchTerm("");
    };
  }, [editor]);

  return (
    <div className="find-replace-bar" onKeyDown={handleKeyDown}>
      <div className="find-replace-row">
        {/* Search input */}
        <div className="find-replace-field">
          <input
            ref={searchInputRef}
            type="text"
            className="find-replace-input"
            placeholder="Find"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {/* Results counter */}
        <div className="find-replace-counter">
          {searchTerm ? (
            results.length > 0 ? (
              <span>{resultIndex + 1}/{results.length}</span>
            ) : (
              <span className="find-replace-no-results">No results</span>
            )
          ) : null}
        </div>

        {/* Navigation arrows */}
        <button
          type="button"
          className="find-replace-btn"
          onClick={handlePrevious}
          disabled={results.length === 0}
          title="Previous (Shift+Enter)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>

        <button
          type="button"
          className="find-replace-btn"
          onClick={handleNext}
          disabled={results.length === 0}
          title="Next (Enter)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {/* Separator */}
        <div className="find-replace-separator" />

        {/* Replace input */}
        <div className="find-replace-field">
          <input
            type="text"
            className="find-replace-input"
            placeholder="Replace"
            value={replaceTerm}
            onChange={handleReplaceChange}
          />
        </div>

        {/* Replace button */}
        <button
          type="button"
          className="find-replace-btn find-replace-btn-action"
          onClick={handleReplace}
          disabled={results.length === 0}
          title="Replace"
        >
          Replace
        </button>

        {/* Replace all button */}
        <button
          type="button"
          className="find-replace-btn find-replace-btn-action"
          onClick={handleReplaceAll}
          disabled={results.length === 0}
          title="Replace All"
        >
          Replace All
        </button>

        {/* Separator */}
        <div className="find-replace-separator" />

        {/* Case sensitivity toggle */}
        <button
          type="button"
          className={`find-replace-btn find-replace-btn-toggle ${caseSensitive ? "is-active" : ""}`}
          onClick={toggleCaseSensitive}
          title="Match Case"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 15h4l2.5-6.5L12 15h4"></path>
            <path d="M1 20h6"></path>
            <path d="M17 20h6"></path>
            <path d="M16 8h4"></path>
            <path d="M18 4v8"></path>
          </svg>
        </button>

        {/* Close button */}
        <button
          type="button"
          className="find-replace-btn find-replace-btn-close"
          onClick={onClose}
          title="Close (Esc)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default FindReplaceBar;
