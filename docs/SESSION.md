# Collaboration Session Summary

## Overview

This session implemented real-time collaborative editing using Hocuspocus and Yjs for the TipTap-based document editor.

## What Was Built

### Hocuspocus Server (`collab-server/server.js`)
- WebSocket server running on port 1234
- File-based persistence in `collab-server/documents/`
- Connection/disconnection logging

### Frontend Collaboration Hook (`frontend/src/lib/hooks/useCollaboration.ts`)
- Manages HocuspocusProvider lifecycle
- Provides TipTap Collaboration and CollaborationCursor extensions
- Tracks connection status and connected users
- Supports document seeding from uploaded content
- Custom cursor rendering (thin vertical line with hover username)

### UI Updates (`frontend/src/App.tsx`)
- Collaboration toggle checkbox
- User name input field
- Room ID input for multi-tab collaboration
- Status bar showing connection state and connected users
- CollaborativeEditor wrapper component

### Cursor Styling (`frontend/src/index.css`)
- Thin colored vertical line cursor
- Username label appears on hover

## Key Technical Decisions

1. **Document Seeding**: When collaboration is enabled with an uploaded document, the Yjs document is seeded with the uploaded content if the collaborative document is empty.

2. **Room ID**: Users specify a Room ID to join the same collaborative session. Different Room IDs create separate documents.

3. **History Extension**: Disabled when collaboration is active (Yjs provides its own undo/redo).

4. **Provider Lifecycle**: Created in useEffect with cleanup to prevent React StrictMode double-rendering issues.

## Bugs Fixed During Development

| Issue | Cause | Fix |
|-------|-------|-----|
| `Server.configure is not a function` | Hocuspocus v3 API change | Use `new Server({})` |
| `Cannot read properties of null (reading 'awareness')` | Provider null when extensions created | Wait for `isReady` before rendering |
| Editor shows "Connecting..." forever | `isReady` didn't wait for sync | Add `isSynced` to `isReady` check |
| Document not seeding | Checked before sync completed | Check `needsSeeding` after `isSynced` |
| Two users showing in same tab | StrictMode double-rendering | Move provider to useEffect with cleanup |
| Different tabs don't share document | Each upload has unique ID | Add Room ID input field |
| Cursor indicator too large | Default shows full username label | Custom render with CSS hover styles |

## Files Modified

- `collab-server/server.js` - Hocuspocus server
- `collab-server/package.json` - Server dependencies
- `frontend/src/lib/hooks/useCollaboration.ts` - Collaboration hook
- `frontend/src/lib/hooks/useDocumentEditor.ts` - Skip History for collaboration
- `frontend/src/App.tsx` - UI and CollaborativeEditor component
- `frontend/src/index.css` - Cursor styles
- `Procfile.dev` - Added collab server

## Running the Collaboration Server

```bash
# Start all services including collaboration server
overmind start -f Procfile.dev

# Or run just the collaboration server
cd collab-server && node server.js
```

## Usage

1. Upload a document or use the sample
2. Check "Enable Collaboration"
3. Enter a username
4. Enter a Room ID (share this with collaborators)
5. Open another browser tab with the same Room ID to test
