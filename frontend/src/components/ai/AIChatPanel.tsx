import { useRef, useEffect, useCallback } from "react";
import { useAIEditor, ChatMessage } from "../../context/AIEditorContext";

interface AIChatPanelProps {
  className?: string;
  showHeader?: boolean;
  headerTitle?: string;
  maxHeight?: string;
}

/**
 * AIChatPanel - A separable component for displaying AI chat messages
 *
 * This component can be placed anywhere in your layout as long as it's
 * wrapped by an AIEditorProvider. It displays the conversation history
 * and allows applying suggested edits.
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
  const { messages, isLoading, error, applyEdit, clearMessages } = useAIEditor();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Extract replacement from assistant message
  const extractReplacement = useCallback((content: string): string | null => {
    const match = content.match(/```replacement\n([\s\S]*?)\n```/);
    return match ? match[1] : null;
  }, []);

  const handleApplyEdit = useCallback(
    (replacement: string) => {
      applyEdit(replacement);
    },
    [applyEdit]
  );

  const renderMessage = (message: ChatMessage) => {
    const replacement = message.role === "assistant" ? extractReplacement(message.content) : null;

    // Format content - remove the code block if we're showing an Apply button
    let displayContent = message.content;
    if (replacement) {
      displayContent = message.content.replace(/```replacement\n[\s\S]*?\n```/, "").trim();
      if (!displayContent) {
        displayContent = "Here's my suggested edit:";
      }
    }

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

        <div className="chat-message-content">
          {displayContent}

          {message.metadata?.selectionContext?.hasSelection && (
            <div className="chat-message-context">
              <span className="context-label">Selected:</span>
              <span className="context-text">
                "{message.metadata.selectionContext.text.slice(0, 50)}
                {message.metadata.selectionContext.text.length > 50 ? "..." : ""}"
              </span>
            </div>
          )}
        </div>

        {replacement && (
          <div className="chat-message-replacement">
            <div className="replacement-preview">
              <pre>{replacement.slice(0, 200)}{replacement.length > 200 ? "..." : ""}</pre>
            </div>
            <button
              type="button"
              className="replacement-apply-btn"
              onClick={() => handleApplyEdit(replacement)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Apply Edit
            </button>
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
              Use the prompt input to start a conversation
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
