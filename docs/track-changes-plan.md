# Track Changes Implementation Plan

## Overview

Two features to implement:
1. **Track Changes Editing Mode** - Toggle to make edits create insertion/deletion marks instead of direct edits
2. **Export with Revisions & Comments** - Export TipTap doc to Word preserving unresolved changes and comments

---

## Feature 1: Track Changes Editing Mode

### Approach

Create a TipTap extension that intercepts editor transactions and transforms them:
- When enabled, deletions become deletion marks (text stays but marked as deleted)
- When enabled, insertions become insertion marks (text added with insertion mark)

### Implementation

#### 1.1 Create TrackChangesMode Extension

**File:** `frontend/src/extensions/TrackChangesMode.ts`

```typescript
// ProseMirror plugin that:
// - Uses appendTransaction to intercept changes
// - Detects text deletions → wraps deleted text in deletion mark instead
// - Detects text insertions → wraps new text in insertion mark
// - Stores enabled state and author info
```

Key mechanics:
- Compare old state vs new state in `appendTransaction`
- For each step that deletes text: undo the deletion, apply deletion mark instead
- For each step that inserts text: add insertion mark to new text
- Generate unique IDs for each change (timestamp + random)

#### 1.2 Add Toggle UI

**File:** `frontend/src/components/TrackChangesToolbar.tsx`

Add toggle button at top of toolbar:
- "Track Changes: ON/OFF" toggle
- Author name input (stored in localStorage)
- Visual indicator when mode is active

#### 1.3 Update App State

**File:** `frontend/src/App.tsx`

- Add `trackChangesEnabled` state
- Add `currentAuthor` state  
- Pass to DocumentEditor and TrackChangesToolbar

---

## Feature 2: Export with Revisions & Comments

### Approach

Enhance `docx_exporter.py` to:
1. Detect insertion/deletion marks in TipTap JSON
2. Create corresponding `w:ins`/`w:del` XML elements using python-docx's OxmlElement
3. Use python-docx's native `add_comment` API for comments

### Implementation

#### 2.1 Update Export Request

**File:** `backend/main.py`

Add comments to export request:
```python
class ExportRequest(BaseModel):
    tiptap: dict
    filename: str = "document.docx"
    comments: list[dict] = []  # Add comments data
```

#### 2.2 Enhance DOCX Exporter

**File:** `backend/parser/docx_exporter.py`

Update to handle:

**Insertions:**
```python
def add_insertion(paragraph, text, author, date, bold=False, italic=False):
    """Add text wrapped in w:ins element."""
    ins = OxmlElement('w:ins')
    ins.set(qn('w:id'), str(next_id()))
    ins.set(qn('w:author'), author)
    ins.set(qn('w:date'), date)
    
    r = OxmlElement('w:r')
    # Add formatting if needed
    t = OxmlElement('w:t')
    t.text = text
    r.append(t)
    ins.append(r)
    
    paragraph._p.append(ins)
```

**Deletions:**
```python
def add_deletion(paragraph, text, author, date, bold=False, italic=False):
    """Add text wrapped in w:del element."""
    del_elem = OxmlElement('w:del')
    del_elem.set(qn('w:id'), str(next_id()))
    del_elem.set(qn('w:author'), author)
    del_elem.set(qn('w:date'), date)
    
    r = OxmlElement('w:r')
    del_text = OxmlElement('w:delText')
    del_text.text = text
    r.append(del_text)
    del_elem.append(r)
    
    paragraph._p.append(del_elem)
```

**Comments:**
```python
# Use python-docx native API
comment = doc.add_comment(runs, text=comment_text, author=author, initials=initials)
```

#### 2.3 Update Frontend Export

**File:** `frontend/src/App.tsx`

Include comments in export request:
```typescript
const handleExport = async () => {
  const response = await fetch("http://localhost:8000/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tiptap: editorJson,
      filename: document?.filename || "document.docx",
      comments: comments,  // Include comments
    }),
  });
  // ... download handling
};
```

---

## Task Breakdown

### Phase 1: Track Changes Editing Mode (Frontend)

1. [ ] Create `TrackChangesMode.ts` extension with ProseMirror plugin
2. [ ] Add storage for enabled state and author
3. [ ] Implement transaction interception for deletions
4. [ ] Implement transaction interception for insertions
5. [ ] Add toggle UI to TrackChangesToolbar
6. [ ] Add author input field
7. [ ] Test with various edit operations

### Phase 2: Export with Revisions (Backend)

1. [ ] Refactor `docx_exporter.py` to detect marks on text nodes
2. [ ] Implement `add_insertion()` helper using OxmlElement
3. [ ] Implement `add_deletion()` helper using OxmlElement
4. [ ] Update `add_text_run()` to use appropriate helper based on marks
5. [ ] Test insertion export
6. [ ] Test deletion export

### Phase 3: Export with Comments (Backend + Frontend)

1. [ ] Update ExportRequest model to include comments
2. [ ] Update frontend to send comments with export request
3. [ ] Implement comment export using python-docx `add_comment`
4. [ ] Map comment marks in TipTap to runs for `add_comment`
5. [ ] Test comment export

### Phase 4: Integration Testing

1. [ ] Test full round-trip: import → edit with track changes → export → import
2. [ ] Verify Word opens exported documents correctly
3. [ ] Verify changes can be accepted/rejected in Word

---

## Technical Notes

### TipTap Transaction Interception

The key is `appendTransaction` in ProseMirror plugins:
```typescript
appendTransaction(transactions, oldState, newState) {
  // Compare oldState.doc vs newState.doc
  // Return a new transaction that transforms the changes
}
```

### Detecting Changes in Transactions

Use `ReplaceStep` analysis:
- `step.from` and `step.to` define the replaced range
- `step.slice` contains the new content
- If `from !== to` and slice is empty → deletion
- If `from === to` and slice has content → insertion
- If `from !== to` and slice has content → replacement (deletion + insertion)

### Word XML Namespaces

```python
from docx.oxml.ns import qn
# qn('w:ins') → '{http://schemas.openxmlformats.org/.../main}ins'
```

### Comment Ranges in Word

Comments reference text ranges via:
- `w:commentRangeStart` and `w:commentRangeEnd` markers in document
- `w:comment` elements in comments.xml
- python-docx handles this with `mark_comment_range()`
