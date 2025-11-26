import { useState, useCallback, useRef, useEffect } from "react";
import { useAIEditor } from "../../context/AIEditorContext";

interface PromptInputProps {
  className?: string;
  placeholder?: string;
  showSelectionIndicator?: boolean;
}

/**
 * PromptInput - A separable component for entering AI prompts
 *
 * This component automatically detects whether to apply targeted or global edits
 * based on whether the user has selected text in the editor.
 *
 * - If text is selected: AI will target that specific text
 * - If no selection: AI will apply changes globally or answer questions
 *
 * Usage:
 * ```tsx
 * <AIEditorProvider>
 *   <div className="bottom-bar">
 *     <PromptInput showSelectionIndicator />
 *   </div>
 *   <div className="main">
 *     <DocumentEditor ... />
 *   </div>
 * </AIEditorProvider>
 * ```
 */
export function PromptInput({
  className = "",
  placeholder,
  showSelectionIndicator = true,
}: PromptInputProps) {
  const { sendPrompt, isLoading, apiKey, selectionContext } = useAIEditor();
  const [prompt, setPrompt] = useState("");
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

      await sendPrompt(prompt.trim());
      setPrompt("");
    },
    [prompt, isLoading, apiKey, sendPrompt],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const getPlaceholder = (): string => {
    if (placeholder) return placeholder;

    if (!apiKey) {
      return "Enter your OpenAI API key first...";
    }

    if (selectionContext.hasSelection) {
      const truncatedText = selectionContext.text.slice(0, 30);
      const ellipsis = selectionContext.text.length > 30 ? "..." : "";
      return `Edit "${truncatedText}${ellipsis}" or ask about it...`;
    }

    return "Ask a question or request document-wide changes...";
  };

  return (
    <div className={`prompt-input ${className}`}>
      {showSelectionIndicator && (
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
              {selectionContext.text.length} characters selected — edits will
              target this text
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
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              No selection — edits will apply globally
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
            title="Send prompt"
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
