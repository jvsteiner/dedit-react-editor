import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { Editor } from "@tiptap/react";
import { diffWords } from "diff";

// Types for AI edits - paragraph-level replacements using IDs
export interface AIEdit {
  id: string;
  // Paragraph ID (UUID from ParagraphWithId extension)
  paragraphId: string;
  // Original paragraph text
  originalText: string;
  // Full replacement paragraph text
  replacement: string;
  // Brief description of what changed
  reason?: string;
  // Track change IDs after applied (may be multiple for complex diffs)
  trackChangeIds?: string[];
  status: "pending" | "applied" | "accepted" | "rejected";
}

export interface AIResponse {
  message: string;
  edits?: Array<{
    // Paragraph ID from the indexed document
    paragraphId: string;
    // The new full text for this paragraph
    newText: string;
    // What was changed
    reason?: string;
  }>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    selectionContext?: SelectionContext;
    // Edits associated with this message
    edits?: AIEdit[];
  };
}

export interface SelectionContext {
  text: string;
  from: number;
  to: number;
  hasSelection: boolean;
}

export interface AIEditorConfig {
  aiAuthorName?: string;
}

export interface AIEditorState {
  // Config
  config: AIEditorConfig;
  setConfig: (config: Partial<AIEditorConfig>) => void;

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
  sendPrompt: (prompt: string) => Promise<void>;
  scrollToEdit: (edit: AIEdit) => void;
  goToEditAndSelect: (edit: AIEdit) => void;
}

const AIEditorContext = createContext<AIEditorState | null>(null);

const STORAGE_KEY = "dedit-openai-api-key";

// Generate unique ID
const generateId = () =>
  `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const generateEditId = () =>
  `edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface AIEditorProviderProps {
  children: ReactNode;
  aiAuthorName?: string;
}

interface ParagraphInfo {
  id: string;
  text: string;
  from: number; // Start of text content (inside paragraph node)
  to: number; // End of text content
}

/**
 * Build an indexed document string with paragraph IDs for AI context.
 * Format: [paragraphId] paragraph text
 * The ID is a UUID that uniquely identifies each paragraph.
 */
function buildIndexedDocument(editor: Editor): {
  document: string;
  paragraphs: Map<string, ParagraphInfo>;
} {
  const doc = editor.state.doc;
  const lines: string[] = [];
  const paragraphs = new Map<string, ParagraphInfo>();

  doc.descendants((node, pos) => {
    if (node.type.name === "paragraph") {
      const id = node.attrs.id;
      const text = node.textContent;

      if (id) {
        lines.push(`[${id}] ${text}`);
        paragraphs.set(id, {
          id,
          text,
          from: pos + 1, // +1 to get inside the paragraph node
          to: pos + node.nodeSize - 1, // -1 to stay inside
        });
      }
    }
    return true;
  });

  return {
    document: lines.join("\n\n"),
    paragraphs,
  };
}

/**
 * Find a paragraph by its ID and return its current position and text.
 */
function findParagraphById(
  editor: Editor,
  paragraphId: string,
): ParagraphInfo | null {
  const doc = editor.state.doc;
  let result: ParagraphInfo | null = null;

  doc.descendants((node, pos) => {
    if (result) return false; // Already found
    if (node.type.name === "paragraph" && node.attrs.id === paragraphId) {
      result = {
        id: paragraphId,
        text: node.textContent,
        from: pos + 1,
        to: pos + node.nodeSize - 1,
      };
      return false;
    }
    return true;
  });

  return result;
}

/**
 * Compute word-level diff between two strings using the diff library.
 * Returns array of changes with positions relative to the old string.
 */
function computeDiff(
  oldStr: string,
  newStr: string,
): Array<{
  type: "keep" | "delete" | "insert";
  text: string;
  oldStart: number;
  oldEnd: number;
}> {
  const wordDiff = diffWords(oldStr, newStr);
  const changes: Array<{
    type: "keep" | "delete" | "insert";
    text: string;
    oldStart: number;
    oldEnd: number;
  }> = [];

  let oldPos = 0;

  for (const part of wordDiff) {
    if (part.added) {
      // Inserted text - position is where we are in old string
      changes.push({
        type: "insert",
        text: part.value,
        oldStart: oldPos,
        oldEnd: oldPos,
      });
    } else if (part.removed) {
      // Deleted text - advances old position
      changes.push({
        type: "delete",
        text: part.value,
        oldStart: oldPos,
        oldEnd: oldPos + part.value.length,
      });
      oldPos += part.value.length;
    } else {
      // Unchanged text - advances old position
      changes.push({
        type: "keep",
        text: part.value,
        oldStart: oldPos,
        oldEnd: oldPos + part.value.length,
      });
      oldPos += part.value.length;
    }
  }

  return changes;
}

/**
 * Build the system prompt for OpenAI with paragraph-based editing instructions.
 */
function buildSystemPrompt(
  indexedDocument: string,
  hasSelection: boolean,
  selectedText: string,
): string {
  let prompt = `You are an AI writing assistant helping to edit documents. You can answer questions about the document or suggest edits.

## Document Format
The document is provided with each paragraph identified by a unique ID in square brackets.
Format: [paragraph-id] paragraph text

## Your Response Format
You MUST respond with valid JSON matching this exact schema:
{
  "message": "Your response text explaining what you did or answering the question",
  "edits": [
    {
      "paragraphId": "the-uuid-from-the-document",
      "newText": "the complete new text for this paragraph",
      "reason": "brief explanation of what changed"
    }
  ]
}

## CRITICAL Rules
1. The "message" field is REQUIRED - always explain what you did or answer the question
2. The "edits" array is OPTIONAL - only include it if you're suggesting changes
3. The "paragraphId" MUST be copied exactly from the document - it's the UUID in brackets before each paragraph
4. The "newText" should be the COMPLETE new text for the paragraph (not just the changed part)
5. If you need to change multiple things in one paragraph, provide ONE edit with all changes in newText
6. If you need to change multiple paragraphs, provide multiple edit objects
7. If no edits are needed (e.g., answering a question), omit the "edits" field entirely

## Example
If the document contains:
[abc-123] The colour of the sky is blue.
[def-456] Birds fly in the sky.

And the user asks to change British spellings to American, respond:
{
  "message": "I've changed 'colour' to 'color' in the first paragraph.",
  "edits": [
    {
      "paragraphId": "abc-123",
      "newText": "The color of the sky is blue.",
      "reason": "Changed British spelling 'colour' to American 'color'"
    }
  ]
}

## Current Document
${indexedDocument}
`;

  if (hasSelection) {
    prompt += `
## User Selection
The user has selected text: "${selectedText}"

If the user asks to edit or change something without specifying where, apply changes to paragraphs containing this selection.
`;
  } else {
    prompt += `
## No Selection
The user has not selected any text. If they ask for edits, apply changes globally across all relevant paragraphs.
`;
  }

  return prompt;
}

export function AIEditorProvider({
  children,
  aiAuthorName = "AI",
}: AIEditorProviderProps) {
  // Config
  const [config, setConfigState] = useState<AIEditorConfig>({
    aiAuthorName,
  });

  const setConfig = useCallback((newConfig: Partial<AIEditorConfig>) => {
    setConfigState((prev) => ({ ...prev, ...newConfig }));
  }, []);

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

  // Store paragraph info for lookups
  const paragraphMapRef = useRef<Map<string, ParagraphInfo>>(new Map());

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

  // Scroll to an edit in the editor
  const scrollToEdit = useCallback((edit: AIEdit) => {
    const ed = editorRef.current;
    if (!ed) return;

    // Try to find by track change ID first
    if (edit.trackChangeIds && edit.trackChangeIds.length > 0) {
      const editorDom = ed.view.dom;
      const element = editorDom.querySelector(
        `[data-insertion-id="${edit.trackChangeIds[0]}"], [data-deletion-id="${edit.trackChangeIds[0]}"]`,
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    // Fallback: find the paragraph by ID
    const para = findParagraphById(ed, edit.paragraphId);
    if (para) {
      ed.commands.focus();
      ed.commands.setTextSelection(para.from);
      const domAtPos = ed.view.domAtPos(para.from);
      if (domAtPos.node) {
        const element =
          domAtPos.node instanceof Element
            ? domAtPos.node
            : domAtPos.node.parentElement;
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, []);

  // Go to edit and select the track change
  const goToEditAndSelect = useCallback(
    (edit: AIEdit) => {
      const ed = editorRef.current;
      if (!ed) return;

      console.log("[goToEditAndSelect] Called with edit:", edit);

      // Try to find and select by track change ID
      if (edit.trackChangeIds && edit.trackChangeIds.length > 0) {
        const trackChangeId = edit.trackChangeIds[0];
        const editorDom = ed.view.dom;

        // Find the element
        const element = editorDom.querySelector(
          `[data-insertion-id="${trackChangeId}"], [data-deletion-id="${trackChangeId}"]`,
        );

        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });

          // Find its index among all track changes for the event
          const allChanges = editorDom.querySelectorAll(
            "ins[data-insertion-id], del[data-deletion-id]",
          );
          let targetIndex = -1;
          allChanges.forEach((el, idx) => {
            const id =
              el.getAttribute("data-insertion-id") ||
              el.getAttribute("data-deletion-id");
            if (id === trackChangeId) {
              targetIndex = idx;
            }
          });

          if (targetIndex >= 0) {
            window.dispatchEvent(
              new CustomEvent("ai-select-change", {
                detail: { index: targetIndex, changeId: trackChangeId },
              }),
            );
          }
          return;
        }
      }

      // Fallback: scroll to paragraph
      scrollToEdit(edit);
    },
    [scrollToEdit],
  );

  // Apply a single paragraph edit as track changes
  const applyParagraphEdit = useCallback(
    (
      ed: Editor,
      paragraphId: string,
      newText: string,
      authorName: string,
    ): string[] => {
      // Find current paragraph position
      const para = findParagraphById(ed, paragraphId);
      if (!para) {
        console.warn(`[applyParagraphEdit] Paragraph ${paragraphId} not found`);
        return [];
      }

      console.log(`[applyParagraphEdit] Editing paragraph ${paragraphId}:`);
      console.log(`  Old: "${para.text}"`);
      console.log(`  New: "${newText}"`);

      // Compute diff between old and new text
      const diff = computeDiff(para.text, newText);
      console.log(`  Diff:`, diff);

      // Get existing track change IDs before applying
      const existingIds = new Set<string>();
      const editorDom = ed.view.dom;
      editorDom
        .querySelectorAll("ins[data-insertion-id], del[data-deletion-id]")
        .forEach((el) => {
          const id =
            el.getAttribute("data-insertion-id") ||
            el.getAttribute("data-deletion-id");
          if (id) existingIds.add(id);
        });

      // Apply changes in reverse order (from end to start) to preserve positions
      const changesWithPositions = diff
        .filter((c) => c.type === "delete" || c.type === "insert")
        .reverse();

      for (const change of changesWithPositions) {
        const docPos = para.from + change.oldStart;

        if (change.type === "delete") {
          // Select and delete the text
          ed.chain()
            .focus()
            .setTextSelection({ from: docPos, to: para.from + change.oldEnd })
            .deleteSelection()
            .run();
        } else if (change.type === "insert") {
          // Position cursor and insert
          ed.chain()
            .focus()
            .setTextSelection(docPos)
            .insertContent(change.text)
            .run();
        }
      }

      // Find new track change IDs that were created
      const newIds: string[] = [];
      editorDom
        .querySelectorAll("ins[data-insertion-id], del[data-deletion-id]")
        .forEach((el) => {
          const id =
            el.getAttribute("data-insertion-id") ||
            el.getAttribute("data-deletion-id");
          const author = el.getAttribute("data-author");
          if (id && !existingIds.has(id) && author === authorName) {
            newIds.push(id);
          }
        });

      console.log(`[applyParagraphEdit] Created track change IDs:`, newIds);
      return newIds;
    },
    [],
  );

  // Apply edits as track changes
  const applyEditsAsTrackChanges = useCallback(
    (edits: AIEdit[], authorName: string): AIEdit[] => {
      const ed = editorRef.current;
      if (!ed || edits.length === 0) return edits;

      // Enable track changes with AI author
      const wasEnabled = ed.storage.trackChangesMode?.enabled || false;
      const previousAuthor = ed.storage.trackChangesMode?.author || "User";

      ed.commands.enableTrackChanges();
      ed.commands.setTrackChangesAuthor(authorName);

      // Apply each edit and collect track change IDs
      const updatedEdits: AIEdit[] = edits.map((edit) => {
        const trackChangeIds = applyParagraphEdit(
          ed,
          edit.paragraphId,
          edit.replacement,
          authorName,
        );

        return {
          ...edit,
          trackChangeIds,
          status:
            trackChangeIds.length > 0
              ? ("applied" as const)
              : ("pending" as const),
        };
      });

      // Restore previous track changes state
      if (!wasEnabled) {
        ed.commands.disableTrackChanges();
      }
      ed.commands.setTrackChangesAuthor(previousAuthor);

      return updatedEdits;
    },
    [applyParagraphEdit],
  );

  // Send prompt to OpenAI
  const sendPrompt = useCallback(
    async (prompt: string) => {
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
      const hasSelection = from !== to && selectedText.length > 0;

      // Build indexed document for AI
      const { document: indexedDocument, paragraphs } =
        buildIndexedDocument(ed);
      paragraphMapRef.current = paragraphs;

      console.log(
        "[sendPrompt] Indexed document:",
        indexedDocument.substring(0, 500) + "...",
      );

      // Add user message
      addMessage({
        role: "user",
        content: prompt,
        metadata: {
          selectionContext: {
            text: selectedText,
            from,
            to,
            hasSelection,
          },
        },
      });

      // Build system prompt
      const systemPrompt = buildSystemPrompt(
        indexedDocument,
        hasSelection,
        selectedText,
      );

      try {
        // Define JSON schema for structured output
        const responseSchema = {
          type: "json_schema",
          json_schema: {
            name: "ai_edit_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "Response message explaining what was done",
                },
                edits: {
                  type: "array",
                  description:
                    "Array of paragraph edits (empty if no changes needed)",
                  items: {
                    type: "object",
                    properties: {
                      paragraphId: {
                        type: "string",
                        description: "The UUID of the paragraph to edit",
                      },
                      newText: {
                        type: "string",
                        description: "The complete new text for the paragraph",
                      },
                      reason: {
                        type: "string",
                        description: "Brief explanation of what was changed",
                      },
                    },
                    required: ["paragraphId", "newText", "reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["message", "edits"],
              additionalProperties: false,
            },
          },
        };

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-5-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
              ],
              temperature: 1.0,
              max_completion_tokens: 16384,
              response_format: responseSchema,
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
        const assistantContent = data.choices?.[0]?.message?.content || "{}";
        console.log(
          "[sendPrompt] Raw response:",
          assistantContent.substring(0, 500) + "...",
        );

        // Parse the JSON response
        let aiResponse: AIResponse;
        try {
          aiResponse = JSON.parse(assistantContent);
          console.log(
            "[sendPrompt] Parsed - message:",
            aiResponse.message?.substring(0, 100),
          );
          console.log(
            "[sendPrompt] Parsed - edits:",
            aiResponse.edits?.length || 0,
          );
        } catch (parseErr) {
          console.error("[sendPrompt] JSON parse failed:", parseErr);
          aiResponse = { message: assistantContent };
        }

        // Convert edits to AIEdit format
        let processedEdits: AIEdit[] = [];
        if (aiResponse.edits && aiResponse.edits.length > 0) {
          // Look up original text for each paragraph
          processedEdits = aiResponse.edits.map((edit) => {
            const paraInfo = paragraphMapRef.current.get(edit.paragraphId);
            return {
              id: generateEditId(),
              paragraphId: edit.paragraphId,
              originalText: paraInfo?.text || "",
              replacement: edit.newText,
              reason: edit.reason,
              status: "pending" as const,
            };
          });

          // Apply edits as track changes
          try {
            processedEdits = applyEditsAsTrackChanges(
              processedEdits,
              config.aiAuthorName || "AI",
            );
          } catch (applyErr) {
            console.error("[sendPrompt] Error applying edits:", applyErr);
          }
        }

        // Add assistant message
        console.log(
          "[sendPrompt] Adding message:",
          aiResponse.message?.substring(0, 100),
        );
        addMessage({
          role: "assistant",
          content: aiResponse.message || "No message provided",
          metadata: {
            edits: processedEdits.length > 0 ? processedEdits : undefined,
          },
        });
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
    [apiKey, addMessage, applyEditsAsTrackChanges, config.aiAuthorName],
  );

  const value: AIEditorState = {
    config,
    setConfig,
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
    scrollToEdit,
    goToEditAndSelect,
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
