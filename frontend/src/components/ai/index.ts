// AI Editor Components
// These components can be placed anywhere in your layout as long as
// they are wrapped by an AIEditorProvider. They communicate through
// the shared context regardless of their position in the component tree.

export { APIKeyInput } from "./APIKeyInput";
export { AIChatPanel } from "./AIChatPanel";
export { PromptInput } from "./PromptInput";

// Re-export context and hooks for convenience
export {
  AIEditorProvider,
  useAIEditor,
  useAIEditorOptional,
} from "../../context/AIEditorContext";

export type {
  AIEditorState,
  AIEditorConfig,
  ChatMessage,
  SelectionContext,
  AIEdit,
  AIResponse,
} from "../../context/AIEditorContext";
