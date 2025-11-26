import { useState, useCallback, useRef, useEffect } from "react";
import { useAIEditor } from "../../context/AIEditorContext";

type PromptMode = "targeted" | "global" | "analysis";

interface PromptInputProps {
  className?: string;
  showModeSelector?: boolean;
  defaultMode?: PromptMode;
  placeholder?: string;
  showSelectionIndicator?: boolean;
}

/**
 * PromptInput - A separable component for entering AI prompts
 *
 * This component can be placed anywhere in your layout as long as it's
 * wrapped by an AIEditorProvider. It provides a text input for entering
 * prompts and mode selection for different types of AI operations.
 *
 * Usage:
 * ```tsx
 * <AIEditorProvider>
 *   <div className="bottom-bar">
 *     <PromptInput showModeSelector showSelectionIndicator />
 *   </div>
 *   <div className="main">
 *     <DocumentEditor ... />
 *   </div>
 * </AIEditorProvider>
 * ```
 */
export function PromptInput({
  className = "",
  showModeSelector = true,
  defaultMode = "targeted",
  placeholder,
  showSelectionIndicator = true,
}: PromptInputProps) {
  const { sendPrompt, isLoading, apiKey, selectionContext } = useAIEditor();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<PromptMode>(defaultMode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!prompt.trim() || isLoading || !apiKey) return;

      await sendPrompt(prompt.trim(), mode);
      setPrompt("");
    },
    [prompt, isLoading, apiKey, sendPrompt, mode]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const getPlaceholder = (): string => {
    if (placeholder) return placeholder;

    if (!apiKey) {
      return "Enter your OpenAI API key first...";
    }

    switch (mode) {
      case "targeted":
        return selectionContext.hasSelection
          ? `Rewrite "${selectionContext.text.slice(0, 30)}${selectionContext.text.length > 30 ? "..." : ""}"...`
          : "Select text in the editor, then describe how to change it...";
      case "global":
        return "Describe changes to apply to the entire document...";
      case "analysis":
        return "Ask a question about the document...";
      default:
        return "Enter a prompt...";
    }
  };

  const getModeDescription = (): string => {
    switch (mode) {
      case "targeted":
        return "Edit selected text";
      case "global":
        return "Edit entire document";
      case "analysis":
        return "Analyze & ask questions";
      default:
        return "";
    }
  };

  return (
    <div className={`prompt-input ${className}`}>
      {showModeSelector && (
        <div className="prompt-mode-selector">
          <button
            type="button"
            className={`prompt-mode-btn ${mode === "targeted" ? "active" : ""}`}
            onClick={() => setMode("targeted")}
            title="Edit selected text"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Targeted
          </button>
          <button
            type="button"
            className={`prompt-mode-btn ${mode === "global" ? "active" : ""}`}
            onClick={() => setMode("global")}
            title="Edit entire document"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Global
          </button>
          <button
            type="button"
            className={`prompt-mode-btn ${mode === "analysis" ? "active" : ""}`}
            onClick={() => setMode("analysis")}
            title="Analyze & ask questions"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Analysis
          </button>
        </div>
      )}

      {showSelectionIndicator && mode === "targeted" && (
        <div className="prompt-selection-indicator">
          {selectionContext.hasSelection ? (
            <span className="selection-active">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {selectionContext.text.length} characters selected
            </span>
          ) : (
            <span className="selection-hint">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5.52 19c.64-2.2 1.84-3 3.22-3h6.52c1.38 0 2.58.8 3.22 3" />
                <circle cx="12" cy="10" r="3" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              Select text to edit
            </span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="prompt-form">
        <div className="prompt-input-wrapper">
          <textarea
            ref={textareaRef}
            className="prompt-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={isLoading || !apiKey}
            rows={1}
          />
          <button
            type="submit"
            className="prompt-submit-btn"
            disabled={!prompt.trim() || isLoading || !apiKey}
            title={getModeDescription()}
          >
            {isLoading ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="prompt-loading-icon"
              >
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <div className="prompt-hint">
          Press Enter to send, Shift+Enter for new line
        </div>
      </form>
    </div>
  );
}

export default PromptInput;
