# Migration Guide

## v0.1.33 → v0.1.34

### Summary

This release refactors the AI mode system to be pluggable. **No breaking changes** - existing code continues to work without modification.

### What Changed

The internal implementation of `/edit` and `/review` modes was refactored to use a handler pattern. This enables custom slash commands but doesn't change the external API.

### New Features (Optional)

#### Custom Slash Commands

You can now add custom slash commands alongside the built-in `/edit` and `/review`:

```tsx
import { AIEditorProvider, AIMode, ModeContext, ModeResult } from 'dedit-react-editor';

const myMode: AIMode = {
  name: "summarize",
  description: "Summarize the document",
  icon: <Sparkles size={14} />,
  handler: async (context: ModeContext): Promise<ModeResult> => {
    // Your logic here
    return { message: "Done" };
  },
};

<AIEditorProvider config={{ 
  aiAuthorName: "AI",
  modes: [myMode],  // Appears alongside /edit and /review
}}>
```

#### Review Mode with Custom Backend

If you were using `onAIRequest` for a custom backend and the `/review` command wasn't working, add `onAIReviewRequest`:

```tsx
// Before (v0.1.33) - /review would fail with API key error
<AIEditorProvider config={{ 
  onAIRequest: handleEdit,
}}>

// After (v0.1.34) - /review works with custom backend
<AIEditorProvider config={{ 
  onAIRequest: handleEdit,
  onAIReviewRequest: handleReview,  // Add this
}}>
```

### New Exports

These types are now exported for custom mode development:

```tsx
import {
  AIMode,
  ModeContext,
  ModeResult,
  ModeEdit,
  ModeRecommendation,
  AIReviewRequest,
  AIReviewResponse,
} from 'dedit-react-editor';
```

### No Action Required

If you're not using custom modes or the `/review` command with a custom backend, no changes are needed. Your existing code will continue to work.
