# Reusable Document Editor Component Plan

## Overview

Extract the document editor functionality into a single, flexible, unstyled React component that can be imported and configured in any React project.

## Design Principles

1. **Headless/Unstyled** - No default styles, full control via className props or render props
2. **Configurable** - All features opt-in via props
3. **Controlled or Uncontrolled** - Support both patterns
4. **Backend-Agnostic** - No hardcoded API calls; use callbacks/adapters
5. **Tree-Shakeable** - Only include what's used
6. **TypeScript-First** - Full type safety with exported types

---

## Component Architecture

### Primary Export: `<DocumentEditor />`

A single component that encapsulates the entire editor functionality.

```tsx
import { DocumentEditor } from '@dedit/react-editor';

<DocumentEditor
  // Content
  initialContent={tiptapJson}
  onChange={(json) => {}}
  
  // Track Changes
  trackChanges={{
    enabled: true,
    author: "John Doe",
    onAuthorChange: (author) => {},
  }}
  
  // Comments (optional)
  comments={commentsArray}
  onCommentAdd={(range, text) => {}}
  onCommentReply={(commentId, text) => {}}
  onCommentResolve={(commentId) => {}}
  onCommentDelete={(commentId) => {}}
  
  // Editor instance ref
  editorRef={editorRef}
  
  // Styling hooks
  className="my-editor"
  classNames={{
    content: "editor-content",
    insertion: "my-insertion",
    deletion: "my-deletion",
    comment: "my-comment",
  }}
/>
```

### Secondary Exports: Primitives

For maximum flexibility, also export building blocks:

```tsx
import {
  // Core editor
  DocumentEditor,
  useDocumentEditor,
  
  // Track changes utilities
  useTrackChanges,
  
  // Comment utilities  
  useComments,
  
  // Export utilities
  createExportPayload,
  
  // TipTap extensions (for custom editor setups)
  InsertionMark,
  DeletionMark,
  CommentMark,
  TrackChangesModeExtension,
  SectionNode,
  TableWithIdNode,
  
  // Types
  type DocumentEditorProps,
  type TrackChangesConfig,
  type CommentData,
  type ExportPayload,
} from '@dedit/react-editor';
```

---

## Props API Design

### Core Props

```typescript
interface DocumentEditorProps {
  /** Initial TipTap JSON content */
  initialContent?: TipTapDocument;
  
  /** Controlled content (makes component controlled) */
  content?: TipTapDocument;
  
  /** Called on every content change */
  onChange?: (content: TipTapDocument) => void;
  
  /** Ref to access editor instance imperatively */
  editorRef?: React.RefObject<EditorHandle>;
  
  /** Make editor read-only */
  readOnly?: boolean;
  
  /** Placeholder text when empty */
  placeholder?: string;
}
```

### Track Changes Props

```typescript
interface TrackChangesConfig {
  /** Enable track changes mode */
  enabled: boolean;
  
  /** Current author name for new changes */
  author: string;
  
  /** Called when author should change (optional) */
  onAuthorChange?: (author: string) => void;
  
  /** Called when a change is accepted */
  onAccept?: (change: TrackedChange) => void;
  
  /** Called when a change is rejected */
  onReject?: (change: TrackedChange) => void;
}

interface DocumentEditorProps {
  /** Track changes configuration */
  trackChanges?: TrackChangesConfig;
}
```

### Comments Props

```typescript
interface CommentsConfig {
  /** Array of comments to display/associate */
  data: CommentData[];
  
  /** Called when user creates a comment */
  onAdd?: (range: SelectionRange, text: string) => void;
  
  /** Called when user replies to a comment */
  onReply?: (commentId: string, text: string) => void;
  
  /** Called when user resolves a comment */
  onResolve?: (commentId: string) => void;
  
  /** Called when user deletes a comment */
  onDelete?: (commentId: string) => void;
}

interface DocumentEditorProps {
  /** Comments configuration */
  comments?: CommentsConfig;
}
```

### Styling Props

```typescript
interface ClassNameConfig {
  /** Root editor container */
  root?: string;
  
  /** The editable content area */
  content?: string;
  
  /** Insertion marks */
  insertion?: string;
  
  /** Deletion marks */
  deletion?: string;
  
  /** Comment highlights */
  comment?: string;
  
  /** Tables */
  table?: string;
}

interface DocumentEditorProps {
  /** Single className for root */
  className?: string;
  
  /** Granular className overrides */
  classNames?: ClassNameConfig;
  
  /** Inline style for root (discouraged but available) */
  style?: React.CSSProperties;
}
```

### Extension Props

```typescript
interface DocumentEditorProps {
  /** Additional TipTap extensions to include */
  extensions?: Extension[];
  
  /** Override default extensions entirely */
  replaceExtensions?: Extension[];
  
  /** Configure built-in extensions */
  extensionConfig?: {
    heading?: { levels?: number[] };
    table?: { resizable?: boolean };
  };
}
```

---

## Imperative Handle API

```typescript
interface EditorHandle {
  /** Get current TipTap JSON */
  getContent(): TipTapDocument;
  
  /** Set content programmatically */
  setContent(content: TipTapDocument): void;
  
  /** Get all tracked changes */
  getChanges(): TrackedChange[];
  
  /** Accept a specific change */
  acceptChange(changeId: string): void;
  
  /** Reject a specific change */
  rejectChange(changeId: string): void;
  
  /** Accept all changes */
  acceptAllChanges(): void;
  
  /** Reject all changes */
  rejectAllChanges(): void;
  
  /** Enable/disable track changes */
  setTrackChangesEnabled(enabled: boolean): void;
  
  /** Set track changes author */
  setTrackChangesAuthor(author: string): void;
  
  /** Get underlying TipTap editor instance */
  getEditor(): Editor | null;
  
  /** Focus the editor */
  focus(): void;
  
  /** Blur the editor */
  blur(): void;
  
  /** Create export payload for backend */
  createExportPayload(options?: ExportOptions): ExportPayload;
}
```

---

## Export Utility

Since the backend API structure may vary, provide a utility to create export payloads:

```typescript
interface ExportOptions {
  /** Include comments in export */
  includeComments?: boolean;
  
  /** Template configuration */
  template?: {
    type: 'none' | 'original' | 'custom';
    /** Original document ID (if type is 'original') */
    documentId?: string;
    /** Template bytes or ID (if type is 'custom') */
    templateId?: string;
    templateBytes?: ArrayBuffer;
  };
  
  /** Output filename */
  filename?: string;
}

interface ExportPayload {
  tiptap: TipTapDocument;
  comments: CommentData[];
  template: string;
  document_id?: string;
  template_id?: string;
  filename: string;
}

// Utility function
function createExportPayload(
  editor: EditorHandle,
  comments: CommentData[],
  options?: ExportOptions
): ExportPayload;
```

---

## Hooks API (Advanced Usage)

For users who want to build custom UIs:

### `useDocumentEditor`

```typescript
function useDocumentEditor(options: UseDocumentEditorOptions): {
  editor: Editor | null;
  content: TipTapDocument;
  setContent: (content: TipTapDocument) => void;
  isReady: boolean;
};
```

### `useTrackChanges`

```typescript
function useTrackChanges(editor: Editor | null): {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  author: string;
  setAuthor: (author: string) => void;
  changes: TrackedChange[];
  acceptChange: (id: string) => void;
  rejectChange: (id: string) => void;
  acceptAll: () => void;
  rejectAll: () => void;
};
```

### `useComments`

```typescript
function useComments(editor: Editor | null, comments: CommentData[]): {
  goToComment: (commentId: string) => void;
  addComment: (text: string) => void;
  removeComment: (commentId: string) => void;
  getCommentAtCursor: () => string | null;
};
```

---

## Package Structure

```
@dedit/react-editor/
├── src/
│   ├── index.ts                 # Main exports
│   ├── DocumentEditor.tsx       # Main component
│   ├── hooks/
│   │   ├── useDocumentEditor.ts
│   │   ├── useTrackChanges.ts
│   │   └── useComments.ts
│   ├── extensions/
│   │   ├── Insertion.ts
│   │   ├── Deletion.ts
│   │   ├── Comment.ts
│   │   ├── TrackChangesMode.ts
│   │   ├── Section.ts
│   │   └── TableWithId.ts
│   ├── utils/
│   │   ├── createExportPayload.ts
│   │   └── changeUtils.ts
│   └── types/
│       ├── editor.ts
│       ├── comments.ts
│       ├── trackChanges.ts
│       └── export.ts
├── package.json
├── tsconfig.json
├── README.md
└── CHANGELOG.md
```

---

## Usage Examples

### Basic Usage (Minimal)

```tsx
import { DocumentEditor } from '@dedit/react-editor';

function MyApp() {
  const [content, setContent] = useState(initialContent);
  
  return (
    <DocumentEditor
      content={content}
      onChange={setContent}
      className="prose max-w-none"
    />
  );
}
```

### With Track Changes

```tsx
import { DocumentEditor } from '@dedit/react-editor';

function MyApp() {
  const [content, setContent] = useState(initialContent);
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(true);
  const editorRef = useRef<EditorHandle>(null);
  
  const handleExport = async () => {
    const payload = editorRef.current?.createExportPayload({
      template: { type: 'original', documentId: docId },
      filename: 'edited-document.docx',
    });
    
    await fetch('/api/export', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };
  
  return (
    <>
      <button onClick={() => setTrackChangesEnabled(!trackChangesEnabled)}>
        Toggle Track Changes
      </button>
      <button onClick={() => editorRef.current?.acceptAllChanges()}>
        Accept All
      </button>
      <button onClick={handleExport}>
        Export
      </button>
      
      <DocumentEditor
        editorRef={editorRef}
        content={content}
        onChange={setContent}
        trackChanges={{
          enabled: trackChangesEnabled,
          author: "John Doe",
        }}
      />
    </>
  );
}
```

### Custom UI with Hooks

```tsx
import { 
  useDocumentEditor, 
  useTrackChanges,
  InsertionMark,
  DeletionMark,
  TrackChangesModeExtension,
} from '@dedit/react-editor';
import { EditorContent } from '@tiptap/react';

function CustomEditor() {
  const { editor, content } = useDocumentEditor({
    initialContent,
    extensions: [InsertionMark, DeletionMark, TrackChangesModeExtension],
  });
  
  const { 
    changes, 
    acceptChange, 
    rejectChange,
    enabled,
    setEnabled,
  } = useTrackChanges(editor);
  
  return (
    <div>
      <MyCustomToolbar 
        trackChangesEnabled={enabled}
        onToggle={() => setEnabled(!enabled)}
      />
      
      <EditorContent editor={editor} />
      
      <MyCustomChangesList
        changes={changes}
        onAccept={acceptChange}
        onReject={rejectChange}
      />
    </div>
  );
}
```

---

## Implementation Tasks

### Phase 1: Core Component ✅
1. [x] Create package structure with TypeScript config
2. [x] Extract and refactor DocumentEditor component
3. [x] Define all TypeScript interfaces
4. [x] Implement controlled/uncontrolled pattern
5. [x] Add editorRef imperative handle
6. [x] Remove all hardcoded styles, add className props

### Phase 2: Track Changes ✅
1. [x] Extract TrackChangesMode extension
2. [x] Create useTrackChanges hook
3. [x] Implement change accept/reject via imperative handle
4. [x] Add trackChanges prop configuration

### Phase 3: Comments ✅
1. [x] Extract Comment extension
2. [x] Create useComments hook
3. [x] Implement comment callbacks
4. [x] Add comments prop configuration

### Phase 4: Export Utilities ✅
1. [x] Create createExportPayload utility
2. [x] Document expected backend API contract
3. [x] Add template configuration support

### Phase 5: Documentation & Publishing
1. [ ] Write comprehensive README
2. [x] Add JSDoc comments to all exports
3. [ ] Create Storybook examples (optional)
4. [ ] Set up npm publishing workflow
5. [x] Add peer dependencies (react, @tiptap/*)

---

## Peer Dependencies

```json
{
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0",
    "@tiptap/react": ">=2.0.0",
    "@tiptap/pm": ">=2.0.0",
    "@tiptap/core": ">=2.0.0"
  }
}
```

---

## CSS Variables (Optional Enhancement)

For users who want minimal styling hooks without full CSS control:

```css
/* User can define these variables */
.dedit-editor {
  --dedit-insertion-bg: #d4edda;
  --dedit-insertion-color: inherit;
  --dedit-deletion-bg: #f8d7da;
  --dedit-deletion-color: #999;
  --dedit-comment-bg: #fff3cd;
}
```

Component applies them only if `useDefaultStyles` prop is true.

---

## Open Questions

1. **Should we bundle TipTap extensions or require them as peer deps?**
   - Recommendation: Bundle custom extensions, peer dep on @tiptap/*

2. **Should we provide a companion backend package?**
   - Could be useful: `@dedit/docx-export` for the Python backend
   - Or document the API contract clearly

3. **How to handle comment persistence?**
   - Keep it callback-based, user manages their own storage

4. **Support for collaborative editing (Yjs)?**
   - Future enhancement, not in v1
