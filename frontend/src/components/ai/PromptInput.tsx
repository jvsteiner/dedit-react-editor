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
 * Supports drag/drop of context items when a ContextItemResolver is configured
 * via AIEditorProvider's config.onResolveContextItems.
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
  const {
    sendPrompt,
    isLoading,
    apiKey,
    selectionContext,
    config,
    contextItems,
    addContextItems,
    removeContextItem,
    resolveContextItems,
  } = useAIEditor();
  const [prompt, setPrompt] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Check if drag/drop is enabled (resolver is configured)
  const isDragDropEnabled = !!config.onResolveContextItems;

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
      // Don't clear context items - they persist in chat history
      // and are cleared when the user clears the chat
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

  // Drag/drop handlers
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDragDropEnabled) {
        setIsDragOver(true);
      }
    },
    [isDragDropEnabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone entirely
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setIsDragOver(false);
      }
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDragDropEnabled) {
        e.dataTransfer.dropEffect = "copy";
      }
    },
    [isDragDropEnabled],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (!isDragDropEnabled) return;

      const items = await resolveContextItems(e.dataTransfer);
      if (items.length > 0) {
        addContextItems(items);
      }
    },
    [isDragDropEnabled, resolveContextItems, addContextItems],
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
    <div
      ref={dropZoneRef}
      className={`prompt-input ${className} ${isDragOver ? "drag-over" : ""}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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

      {/* Context items pills */}
      {contextItems.length > 0 && (
        <div className="prompt-context-items">
          {contextItems.map((item) => (
            <div key={item.id} className="context-item-pill" title={item.label}>
              <span className="context-item-type">{item.type}</span>
              <span className="context-item-label">{item.label}</span>
              <button
                type="button"
                className="context-item-remove"
                onClick={() => removeContextItem(item.id)}
                title="Remove"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drag overlay */}
      {isDragOver && isDragDropEnabled && (
        <div className="prompt-drop-overlay">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>Drop to add context</span>
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
          {isDragDropEnabled && " • Drop files to add context"}
        </div>
      </form>
    </div>
  );
}

export default PromptInput;
