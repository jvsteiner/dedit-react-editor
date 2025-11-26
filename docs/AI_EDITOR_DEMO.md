# AI-Assisted Document Editor Design

A design and implementation plan for adding AI-powered editing capabilities to the dedit document editor demo.

## Overview

Transform the demo into a hybrid human/AI editor where users can leverage OpenAI's LLM API for:
- **Targeted edits**: Select text and request AI rewrites
- **Global edits**: Apply document-wide transformations
- **Analysis**: Get AI insights on selected content or tracked changes

The JSON panel will be replaced with an AI chat interface that maintains conversation context and can execute edits on the document.

**Key Design Decisions:**
1. The frontend calls OpenAI directly (no backend AI proxy)
2. Users enter their own OpenAI API key in the browser, stored in localStorage
3. **Components are fully separable** - editor, chat panel, prompt input, and API key input can be placed anywhere in your layout and still communicate through shared context

---

## Flexible Component Architecture

The AI editor is built with a **provider pattern** that allows components to be placed anywhere in your application layout while maintaining communication.

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       AIEditorProvider                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                     Shared Context (AIEditorState)                   ││
│  │  • apiKey / setApiKey        • editor / setEditor                   ││
│  │  • messages / addMessage     • selectionContext                     ││
│  │  • sendPrompt() / applyEdit()  • isLoading / error                 ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │                  │  │                  │  │                  │       │
│  │  APIKeyInput     │  │  AIChatPanel     │  │  PromptInput     │       │
│  │                  │  │                  │  │                  │       │
│  │  Placed in       │  │  Placed in       │  │  Placed in       │       │
│  │  settings area   │  │  sidebar         │  │  bottom bar      │       │
│  │                  │  │                  │  │                  │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                                                                     │ │
│  │  DocumentEditor (registers with context via setEditor)             │ │
│  │  • Selection changes update selectionContext automatically         │ │
│  │  • applyEdit() can modify the document from any component          │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Usage Examples

#### Example 1: Three-Column Layout

```tsx
import {
  AIEditorProvider,
  APIKeyInput,
  AIChatPanel,
  PromptInput,
} from "./components/ai";
import DocumentEditor from "./components/DocumentEditor";

function ThreeColumnApp() {
  return (
    <AIEditorProvider>
      <div className="ai-editor-layout ai-editor-layout--three-column">
        {/* Left: Settings */}
        <div className="ai-settings-area">
          <APIKeyInput showLabel />
        </div>

        {/* Center: Document */}
        <div className="ai-editor-area">
          <DocumentEditor
            content={document}
            onEditorReady={(editor) => {
              // Connect editor to AI context
              const { setEditor } = useAIEditor();
              setEditor(editor);
            }}
          />
        </div>

        {/* Right: Chat */}
        <div className="ai-chat-area">
          <AIChatPanel showHeader headerTitle="AI Assistant" />
        </div>

        {/* Bottom: Prompt */}
        <div className="ai-prompt-area">
          <PromptInput showModeSelector showSelectionIndicator />
        </div>
      </div>
    </AIEditorProvider>
  );
}
```

#### Example 2: Chat in Modal, Prompt in Footer

```tsx
function ModalChatApp() {
  const [showChat, setShowChat] = useState(false);

  return (
    <AIEditorProvider>
      <div className="app-layout">
        <header>
          <APIKeyInput compact />
          <button onClick={() => setShowChat(true)}>Open AI Chat</button>
        </header>

        <main>
          <DocumentEditor ... />
        </main>

        <footer>
          <PromptInput showModeSelector />
        </footer>

        {/* Chat in a modal - still works! */}
        {showChat && (
          <Modal onClose={() => setShowChat(false)}>
            <AIChatPanel maxHeight="500px" />
          </Modal>
        )}
      </div>
    </AIEditorProvider>
  );
}
```

#### Example 3: Minimal Integration (Just Prompt)

```tsx
function MinimalApp() {
  return (
    <AIEditorProvider>
      <div className="minimal-layout">
        <APIKeyInput compact />
        <DocumentEditor ... />
        {/* Just the prompt input - no chat display */}
        <PromptInput showModeSelector={false} defaultMode="targeted" />
      </div>
    </AIEditorProvider>
  );
}
```

---

## Component Reference

### AIEditorProvider

Wraps your application to provide shared state for all AI components.

```tsx
import { AIEditorProvider } from "./components/ai";

function App() {
  return (
    <AIEditorProvider>
      {/* Your components here */}
    </AIEditorProvider>
  );
}
```

### useAIEditor Hook

Access the shared AI editor state from any component.

```tsx
import { useAIEditor } from "./components/ai";

function MyComponent() {
  const {
    apiKey,           // Current API key
    setApiKey,        // Set API key
    editor,           // TipTap editor instance
    setEditor,        // Register editor with context
    selectionContext, // Current selection {text, from, to, hasSelection}
    messages,         // Chat message history
    addMessage,       // Add a message to chat
    clearMessages,    // Clear chat history
    isLoading,        // Whether AI request is in progress
    error,            // Current error message
    sendPrompt,       // Send prompt to AI
    applyEdit,        // Apply replacement text to editor
  } = useAIEditor();

  // ...
}
```

### APIKeyInput

Input component for OpenAI API key with localStorage persistence.

```tsx
<APIKeyInput
  className="custom-class"   // Optional: additional CSS class
  showLabel={true}           // Show "OpenAI API Key" label
  compact={false}            // Compact mode (just status + change button)
/>
```

### AIChatPanel

Displays conversation history with the AI, including edit previews.

```tsx
<AIChatPanel
  className="custom-class"         // Optional: additional CSS class
  showHeader={true}                // Show header with title
  headerTitle="AI Chat"            // Header title text
  maxHeight="400px"                // Max height for messages area
/>
```

### PromptInput

Text input for sending prompts to the AI.

```tsx
<PromptInput
  className="custom-class"           // Optional: additional CSS class
  showModeSelector={true}            // Show Targeted/Global/Analysis buttons
  defaultMode="targeted"             // Default mode
  placeholder="Custom placeholder"   // Custom placeholder text
  showSelectionIndicator={true}      // Show "X characters selected" indicator
/>
```

---

## Use Cases

### Use Case 1: Targeted Selection Edit

**Scenario**: User selects a paragraph and requests a rewrite.

```
User: [selects paragraph in editor]
User: "Rewrite this for clarity and brevity"
AI: [analyzes selected text]
AI: "Here's a clearer version:" [shows preview]
AI: [user clicks Apply to replace selected text]
```

### Use Case 2: Global Document Edit

**Scenario**: User requests document-wide changes.

```
User: "Replace all Americanized spellings with British spellings"
AI: [scans entire document]
AI: "Found 12 instances to update: color→colour, organize→organise..."
AI: [provides replacement document, user clicks Apply]
```

### Use Case 3: Analysis with Follow-up

**Scenario**: User analyzes a tracked change and requests a rewrite.

```
User: [selects text containing tracked change]
User: "Does this edit increase our liability exposure?"
AI: "Yes, the removal of the limitation clause in section 3.2 
     expands liability scope because..."
User: "Rewrite to avoid the carveout within US jurisdiction"
AI: [generates new text, user clicks Apply]
```

---

## Architecture

### System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          React Frontend                               │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     AIEditorProvider                            │  │
│  │  (Shared Context: apiKey, editor, messages, selection, etc.)   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Components can be placed ANYWHERE in the layout:                    │
│                                                                       │
│  ┌────────────────────┐   ┌────────────────────────────────────────┐ │
│  │  DocumentEditor    │   │         AIChatPanel                     │ │
│  │                    │   │                                         │ │
│  │  ┌──────────────┐  │   │  ┌───────────────────────────────────┐ │ │
│  │  │ TipTap Editor│  │◄──┼──│ ChatMessages                      │ │ │
│  │  │              │  │   │  │ - User messages                   │ │ │
│  │  │ - Selection  │──┼───┼─►│ - AI responses                    │ │ │
│  │  │ - Content    │  │   │  │ - Edit previews with Apply btn    │ │ │
│  │  │ - Track Chgs │  │   │  └───────────────────────────────────┘ │ │
│  │  └──────────────┘  │   └────────────────────────────────────────┘ │
│  └────────────────────┘                                              │
│                                                                       │
│  ┌────────────────────┐   ┌────────────────────────────────────────┐ │
│  │   APIKeyInput      │   │         PromptInput                     │ │
│  │                    │   │                                         │ │
│  │ - Key entry        │   │  - Mode selector (targeted/global)     │ │
│  │ - localStorage     │   │  - Selection indicator                 │ │
│  │ - Show/hide toggle │   │  - Text input                          │ │
│  └────────────────────┘   └────────────────────────────────────────┘ │
│                                              │                        │
└──────────────────────────────────────────────┼────────────────────────┘
                                               │ Direct HTTPS
                                               ▼
                                    ┌─────────────────────┐
                                    │   OpenAI API        │
                                    │   api.openai.com    │
                                    └─────────────────────┘
```

### Data Flow

```
1. User enters OpenAI API key (stored in localStorage via AIEditorProvider)

2. User selects text in editor
   └─► Selection context automatically updates in AIEditorProvider
   └─► PromptInput shows selection indicator (if enabled)

3. User types prompt in PromptInput and submits
   └─► sendPrompt() is called with prompt and mode
   └─► Context builds system prompt with document/selection
   └─► Request sent directly to OpenAI API

4. Response is processed
   └─► AIChatPanel displays AI message
   └─► If edit detected, shows preview with "Apply" button

5. User clicks "Apply Edit"
   └─► applyEdit() called with replacement text
   └─► Editor content is updated
```

---

## File Structure

```
frontend/src/
├── context/
│   └── AIEditorContext.tsx     # Provider + shared state + hooks
├── components/
│   ├── ai/
│   │   ├── index.ts            # Exports all AI components
│   │   ├── APIKeyInput.tsx     # API key input with localStorage
│   │   ├── AIChatPanel.tsx     # Chat history display
│   │   └── PromptInput.tsx     # Prompt input with mode selector
│   └── DocumentEditor.tsx      # Existing (connect via setEditor)
├── App.tsx                     # Demo with flexible layout
└── index.css                   # Includes AI component styles

backend/
└── ...                         # No backend changes needed
```

---

## Context API Reference

### AIEditorState Interface

```typescript
interface AIEditorState {
  // API Key
  apiKey: string | null;
  setApiKey: (key: string | null) => void;

  // Editor reference
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;

  // Selection context (auto-updated from editor)
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
  sendPrompt: (prompt: string, mode: "targeted" | "global" | "analysis") => Promise<void>;
  applyEdit: (replacement: string) => void;
}

interface SelectionContext {
  text: string;
  from: number;
  to: number;
  hasSelection: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    editApplied?: boolean;
    selectionContext?: SelectionContext;
  };
}
```

---

## CSS Layout Classes

Pre-built layout classes for common configurations:

### Three-Column Layout
```css
.ai-editor-layout--three-column {
  /* settings | editor | chat */
  /* prompt spans bottom */
}
```

### Two-Column Layout
```css
.ai-editor-layout--two-column {
  /* editor | sidebar (settings + chat) */
  /* prompt spans bottom */
}
```

### Stacked Layout (Mobile)
```css
.ai-editor-layout--stacked {
  /* settings, editor, chat, prompt stacked vertically */
  /* prompt sticky at bottom */
}
```

---

## Security Considerations

1. **API Key Handling**
   - Key stored in localStorage (client-side only)
   - User is responsible for their own API key
   - Key is sent directly to OpenAI, never to any backend
   - User can clear key at any time

2. **Key Security Trade-offs**
   - **Pros**: Simple, no backend needed, user controls their own usage
   - **Cons**: Key visible in browser dev tools
   - **Mitigation**: Advise users to use API keys with spend limits

3. **Input Validation**
   - Limit document size sent to API (truncated in system prompt)
   - Validate edit payloads before applying to editor

---

## Implementation Status

### Completed
- [x] AIEditorContext and Provider
- [x] useAIEditor hook
- [x] APIKeyInput component (with compact mode)
- [x] AIChatPanel component (with Apply Edit button)
- [x] PromptInput component (with mode selector)
- [x] CSS for all AI components
- [x] Layout classes for flexible positioning
- [x] Direct OpenAI API integration

### To Do
- [ ] Demo App with AI layout
- [ ] Connect DocumentEditor to context via setEditor
- [ ] Test all three modes (targeted, global, analysis)
- [ ] Streaming responses (future enhancement)

---

## Quick Start

1. Wrap your app with `AIEditorProvider`
2. Place `APIKeyInput` where users can enter their key
3. Place `AIChatPanel` to show conversation history
4. Place `PromptInput` for user prompts
5. Connect your `DocumentEditor` to the context:

```tsx
function MyEditor() {
  const { setEditor } = useAIEditor();
  
  return (
    <DocumentEditor
      content={document}
      onEditorReady={(editor) => setEditor(editor)}
    />
  );
}
```

Components will automatically communicate through the shared context regardless of where they are positioned in your layout.
