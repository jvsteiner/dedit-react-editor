import { useRef, useEffect, useCallback } from "react";
import {
  useAIEditor,
  ChatMessage,
  AIEdit,
} from "../../context/AIEditorContext";

interface AIChatPanelProps {
  className?: string;
  showHeader?: boolean;
  headerTitle?: string;
  maxHeight?: string;
}

/**
 * AIChatPanel - A separable component for displaying AI chat messages
 *
 * This component displays the conversation history and shows clickable links
 * for each AI-suggested edit. Clicking a link scrolls the editor to that
 * edit and selects it for review.
 *
 * Usage:
 * ```tsx
 * <AIEditorProvider>
 *   <div className="sidebar">
 *     <AIChatPanel showHeader headerTitle="AI Assistant" />
 *   </div>
 *   <div className="main">
 *     <DocumentEditor ... />
 *   </div>
 * </AIEditorProvider>
 * ```
 */
export function AIChatPanel({
  className = "",
  showHeader = true,
  headerTitle = "AI Chat",
  maxHeight = "400px",
}: AIChatPanelProps) {
  const { messages, isLoading, error, clearMessages, goToEditAndSelect } =
    useAIEditor();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleEditClick = useCallback(
    (edit: AIEdit) => {
      goToEditAndSelect(edit);
    },
    [goToEditAndSelect],
  );

  const renderEditLink = (edit: AIEdit, index: number) => {
    const displayText =
      edit.reason ||
      `${edit.originalText.slice(0, 20)}${edit.originalText.length > 20 ? "..." : ""} → ${edit.replacement.slice(0, 20)}${edit.replacement.length > 20 ? "..." : ""}`;

    return (
      <button
        key={edit.id || index}
        type="button"
        className={`edit-link edit-link--${edit.status}`}
        onClick={() => handleEditClick(edit)}
        title={`Original: "${edit.originalText}"\nReplacement: "${edit.replacement}"`}
      >
        <span className="edit-link-icon">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </span>
        <span className="edit-link-text">{displayText}</span>
        <span className="edit-link-arrow">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </button>
    );
  };

  const renderMessage = (message: ChatMessage) => {
    const edits = message.metadata?.edits;
    const hasEdits = edits && edits.length > 0;

    return (
      <div
        key={message.id}
        className={`chat-message chat-message--${message.role}`}
      >
        <div className="chat-message-header">
          <span className="chat-message-role">
            {message.role === "user"
              ? "You"
              : message.role === "assistant"
                ? "AI"
                : "System"}
          </span>
          <span className="chat-message-time">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="chat-message-content">{message.content}</div>

        {message.metadata?.selectionContext?.hasSelection && (
          <div className="chat-message-context">
            <span className="context-label">Selected:</span>
            <span className="context-text">
              "{message.metadata.selectionContext.text.slice(0, 50)}
              {message.metadata.selectionContext.text.length > 50 ? "..." : ""}"
            </span>
          </div>
        )}

        {hasEdits && (
          <div className="chat-message-edits">
            <div className="edits-header">
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
              {edits.length} edit{edits.length !== 1 ? "s" : ""} suggested
              <span className="edits-hint">
                (click to review, then Accept/Reject)
              </span>
            </div>
            <div className="edits-list">
              {edits.map((edit, index) => renderEditLink(edit, index))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`ai-chat-panel ${className}`}>
      {showHeader && (
        <div className="ai-chat-header">
          <h3 className="ai-chat-title">{headerTitle}</h3>
          {messages.length > 0 && (
            <button
              type="button"
              className="ai-chat-clear-btn"
              onClick={clearMessages}
              title="Clear chat history"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div className="ai-chat-messages" style={{ maxHeight }}>
        {messages.length === 0 ? (
          <div className="ai-chat-empty">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>No messages yet</p>
            <p className="ai-chat-empty-hint">
              Select text for targeted edits, or just ask for document-wide
              changes
            </p>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}

            {isLoading && (
              <div className="chat-message chat-message--assistant chat-message--loading">
                <div className="chat-loading-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="ai-chat-error">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default AIChatPanel;
