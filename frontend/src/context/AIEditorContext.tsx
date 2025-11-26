import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { Editor } from "@tiptap/react";

// Types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    editApplied?: boolean;
    selectionContext?: SelectionContext;
  };
}

export interface SelectionContext {
  text: string;
  from: number;
  to: number;
  hasSelection: boolean;
}

export interface AIEditorState {
  // API Key
  apiKey: string | null;
  setApiKey: (key: string | null) => void;

  // Editor reference
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;

  // Selection context
  selectionContext: SelectionContext;

  // Chat messages
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // Actions
  sendPrompt: (
    prompt: string,
    mode: "targeted" | "global" | "analysis",
  ) => Promise<void>;
  applyEdit: (replacement: string) => void;
}

const AIEditorContext = createContext<AIEditorState | null>(null);

const STORAGE_KEY = "dedit-openai-api-key";

// Generate unique ID for messages
const generateId = () =>
  `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface AIEditorProviderProps {
  children: ReactNode;
}

export function AIEditorProvider({ children }: AIEditorProviderProps) {
  // API Key - persisted in localStorage
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  const setApiKey = useCallback((key: string | null) => {
    setApiKeyState(key);
    if (typeof window !== "undefined") {
      if (key) {
        localStorage.setItem(STORAGE_KEY, key);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Editor reference
  const [editor, setEditor] = useState<Editor | null>(null);
  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  // Selection context - tracked from editor
  const [selectionContext, setSelectionContext] = useState<SelectionContext>({
    text: "",
    from: 0,
    to: 0,
    hasSelection: false,
  });

  // Update selection context when editor changes
  const updateSelectionContext = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) {
      setSelectionContext({ text: "", from: 0, to: 0, hasSelection: false });
      return;
    }

    const { from, to } = ed.state.selection;
    const text = ed.state.doc.textBetween(from, to, " ");
    setSelectionContext({
      text,
      from,
      to,
      hasSelection: from !== to && text.length > 0,
    });
  }, []);

  // Set up editor with selection tracking
  const setEditorWithTracking = useCallback(
    (newEditor: Editor | null) => {
      setEditor(newEditor);
      if (newEditor) {
        // Initial selection update
        updateSelectionContext();

        // Listen for selection changes
        newEditor.on("selectionUpdate", updateSelectionContext);
        newEditor.on("transaction", updateSelectionContext);
      }
    },
    [updateSelectionContext],
  );

  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addMessage = useCallback(
    (message: Omit<ChatMessage, "id" | "timestamp">) => {
      const newMessage: ChatMessage = {
        ...message,
        id: generateId(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);
      return newMessage;
    },
    [],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply edit to the document
  const applyEdit = useCallback((replacement: string) => {
    const ed = editorRef.current;
    if (!ed) return;

    const { from, to } = ed.state.selection;
    if (from === to) {
      // No selection - insert at cursor
      ed.chain().focus().insertContentAt(from, replacement).run();
    } else {
      // Replace selection
      ed.chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, replacement)
        .run();
    }
  }, []);

  // Send prompt to OpenAI
  const sendPrompt = useCallback(
    async (prompt: string, mode: "targeted" | "global" | "analysis") => {
      if (!apiKey) {
        setError("Please enter your OpenAI API key");
        return;
      }

      const ed = editorRef.current;
      if (!ed) {
        setError("Editor not connected");
        return;
      }

      setIsLoading(true);
      setError(null);

      // Get current selection context
      const { from, to } = ed.state.selection;
      const selectedText = ed.state.doc.textBetween(from, to, " ");
      const fullText = ed.state.doc.textContent;

      // Add user message
      addMessage({
        role: "user",
        content: prompt,
        metadata: {
          selectionContext: {
            text: selectedText,
            from,
            to,
            hasSelection: from !== to,
          },
        },
      });

      // Build system prompt based on mode
      let systemPrompt = "";
      let userContent = prompt;

      switch (mode) {
        case "targeted":
          systemPrompt = `You are an AI writing assistant helping to edit a document. The user has selected specific text and wants you to rewrite or modify it.

RULES:
1. Return ONLY the replacement text wrapped in a code block with the language "replacement"
2. Do not include explanations before or after the code block
3. Match the tone and style of the surrounding document
4. If the request is unclear, ask for clarification

SELECTED TEXT:
"""
${selectedText}
"""

SURROUNDING CONTEXT (full document):
"""
${fullText}
"""`;
          userContent = `Please rewrite the selected text according to this instruction: ${prompt}`;
          break;

        case "global":
          systemPrompt = `You are an AI writing assistant helping to edit a document. The user wants to make document-wide changes.

RULES:
1. Return ONLY the complete modified document wrapped in a code block with the language "replacement"
2. Apply the requested changes consistently throughout the entire document
3. Preserve the overall structure and formatting
4. Do not include explanations before or after the code block

FULL DOCUMENT:
"""
${fullText}
"""`;
          userContent = `Please apply this change to the entire document: ${prompt}`;
          break;

        case "analysis":
          systemPrompt = `You are an AI writing assistant analyzing a document. Provide helpful insights based on the user's question.

FULL DOCUMENT:
"""
${fullText}
"""

${selectedText ? `SELECTED TEXT:\n"""\n${selectedText}\n"""` : ""}`;
          userContent = prompt;
          break;
      }

      try {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent },
              ],
              temperature: 0.7,
              max_tokens: 4096,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error?.message ||
              `API request failed: ${response.status}`,
          );
        }

        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message?.content || "";

        // Add assistant message
        addMessage({
          role: "assistant",
          content: assistantMessage,
        });

        // For non-analysis modes, the UI will parse for replacement code blocks
        // and show an "Apply" button - no auto-apply, user reviews first
        void mode;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        addMessage({
          role: "system",
          content: `Error: ${errorMessage}`,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, addMessage],
  );

  const value: AIEditorState = {
    apiKey,
    setApiKey,
    editor,
    setEditor: setEditorWithTracking,
    selectionContext,
    messages,
    addMessage,
    clearMessages,
    isLoading,
    setIsLoading,
    error,
    setError,
    sendPrompt,
    applyEdit,
  };

  return (
    <AIEditorContext.Provider value={value}>
      {children}
    </AIEditorContext.Provider>
  );
}

// Hook to use the AI Editor context
export function useAIEditor(): AIEditorState {
  const context = useContext(AIEditorContext);
  if (!context) {
    throw new Error("useAIEditor must be used within an AIEditorProvider");
  }
  return context;
}

// Optional hook for components that may be outside the provider
export function useAIEditorOptional(): AIEditorState | null {
  return useContext(AIEditorContext);
}
