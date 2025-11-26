import { useState, useCallback } from "react";
import { useAIEditor } from "../../context/AIEditorContext";

interface APIKeyInputProps {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

/**
 * APIKeyInput - A separable component for entering OpenAI API key
 *
 * This component can be placed anywhere in your layout as long as it's
 * wrapped by an AIEditorProvider. It communicates with other AI components
 * through the shared context.
 *
 * Usage:
 * ```tsx
 * <AIEditorProvider>
 *   <div className="settings-panel">
 *     <APIKeyInput showLabel compact />
 *   </div>
 *   <div className="main-area">
 *     <DocumentEditor ... />
 *   </div>
 * </AIEditorProvider>
 * ```
 */
export function APIKeyInput({
  className = "",
  showLabel = true,
  compact = false,
}: APIKeyInputProps) {
  const { apiKey, setApiKey } = useAIEditor();
  const [inputValue, setInputValue] = useState(apiKey || "");
  const [isEditing, setIsEditing] = useState(!apiKey);
  const [showKey, setShowKey] = useState(false);

  const handleSave = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      setApiKey(trimmed);
      setIsEditing(false);
    }
  }, [inputValue, setApiKey]);

  const handleClear = useCallback(() => {
    setApiKey(null);
    setInputValue("");
    setIsEditing(true);
  }, [setApiKey]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSave();
      }
    },
    [handleSave]
  );

  if (compact && apiKey && !isEditing) {
    return (
      <div className={`api-key-input api-key-input--compact ${className}`}>
        <span className="api-key-status api-key-status--set">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          API Key Set
        </span>
        <button
          type="button"
          className="api-key-btn api-key-btn--small"
          onClick={() => setIsEditing(true)}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className={`api-key-input ${className}`}>
      {showLabel && <label className="api-key-label">OpenAI API Key</label>}

      {apiKey && !isEditing ? (
        <div className="api-key-display">
          <span className="api-key-value">
            {showKey ? apiKey : `sk-...${apiKey.slice(-4)}`}
          </span>
          <button
            type="button"
            className="api-key-btn api-key-btn--icon"
            onClick={() => setShowKey(!showKey)}
            title={showKey ? "Hide key" : "Show key"}
          >
            {showKey ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="api-key-btn"
            onClick={() => setIsEditing(true)}
          >
            Change
          </button>
          <button
            type="button"
            className="api-key-btn api-key-btn--danger"
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="api-key-form">
          <input
            type="password"
            className="api-key-input-field"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="sk-..."
            autoComplete="off"
          />
          <button
            type="button"
            className="api-key-btn api-key-btn--primary"
            onClick={handleSave}
            disabled={!inputValue.trim()}
          >
            Save
          </button>
          {apiKey && (
            <button
              type="button"
              className="api-key-btn"
              onClick={() => {
                setInputValue(apiKey);
                setIsEditing(false);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      <p className="api-key-hint">
        Your API key is stored locally in your browser and sent directly to
        OpenAI.
      </p>
    </div>
  );
}

export default APIKeyInput;
