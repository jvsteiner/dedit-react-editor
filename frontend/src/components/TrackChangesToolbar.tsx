import { Editor } from "@tiptap/react";
import { useCallback, useMemo, useState, useEffect } from "react";

interface TrackChangesToolbarProps {
  editor: Editor | null;
  trackChangesEnabled: boolean;
  onTrackChangesToggle: (enabled: boolean) => void;
  author: string;
  onAuthorChange: (author: string) => void;
}

interface Change {
  id: string;
  type: "insertion" | "deletion";
  author: string | null;
  date: string | null;
  text: string;
  from: number;
  to: number;
}

export function TrackChangesToolbar({
  editor,
  trackChangesEnabled,
  onTrackChangesToggle,
  author,
  onAuthorChange,
}: TrackChangesToolbarProps) {
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [tempAuthor, setTempAuthor] = useState(author);

  // Sync track changes state with editor extension
  useEffect(() => {
    if (!editor) return;

    if (trackChangesEnabled) {
      editor.commands.enableTrackChanges();
      editor.commands.setTrackChangesAuthor(author);
    } else {
      editor.commands.disableTrackChanges();
    }
  }, [editor, trackChangesEnabled, author]);

  const handleToggle = useCallback(() => {
    onTrackChangesToggle(!trackChangesEnabled);
  }, [trackChangesEnabled, onTrackChangesToggle]);

  const handleAuthorSave = useCallback(() => {
    onAuthorChange(tempAuthor);
    setIsEditingAuthor(false);
  }, [tempAuthor, onAuthorChange]);

  const changes = useMemo(() => {
    if (!editor) return [];

    const foundChanges: Change[] = [];
    const doc = editor.state.doc;

    doc.descendants((node, pos) => {
      if (node.isText) {
        node.marks.forEach((mark) => {
          if (mark.type.name === "insertion" || mark.type.name === "deletion") {
            foundChanges.push({
              id: mark.attrs.id,
              type: mark.type.name as "insertion" | "deletion",
              author: mark.attrs.author,
              date: mark.attrs.date,
              text: node.text || "",
              from: pos,
              to: pos + node.nodeSize,
            });
          }
        });
      }
    });

    // Deduplicate by id (same mark can span multiple text nodes)
    const seen = new Set<string>();
    return foundChanges.filter((change) => {
      if (seen.has(change.id)) return false;
      seen.add(change.id);
      return true;
    });
  }, [editor?.state.doc]);

  const handleAccept = useCallback(
    (change: Change) => {
      if (!editor) return;

      if (change.type === "insertion") {
        editor.commands.acceptInsertion(change.id);
      } else {
        editor.commands.acceptDeletion(change.id);
      }
    },
    [editor],
  );

  const handleReject = useCallback(
    (change: Change) => {
      if (!editor) return;

      if (change.type === "insertion") {
        editor.commands.rejectInsertion(change.id);
      } else {
        editor.commands.rejectDeletion(change.id);
      }
    },
    [editor],
  );

  const handleAcceptAll = useCallback(() => {
    if (!editor) return;

    changes.forEach((change) => {
      if (change.type === "insertion") {
        editor.commands.acceptInsertion(change.id);
      } else {
        editor.commands.acceptDeletion(change.id);
      }
    });
  }, [editor, changes]);

  const handleRejectAll = useCallback(() => {
    if (!editor) return;

    changes.forEach((change) => {
      if (change.type === "insertion") {
        editor.commands.rejectInsertion(change.id);
      } else {
        editor.commands.rejectDeletion(change.id);
      }
    });
  }, [editor, changes]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  if (!editor) return null;

  return (
    <div className="track-changes-toolbar">
      {/* Track Changes Mode Toggle */}
      <div className="track-changes-mode">
        <div className="mode-toggle-row">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={trackChangesEnabled}
              onChange={handleToggle}
              className="toggle-checkbox"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">
              Track Changes {trackChangesEnabled ? "ON" : "OFF"}
            </span>
          </label>
        </div>

        {trackChangesEnabled && (
          <div className="author-row">
            {isEditingAuthor ? (
              <div className="author-edit">
                <input
                  type="text"
                  value={tempAuthor}
                  onChange={(e) => setTempAuthor(e.target.value)}
                  placeholder="Your name"
                  className="author-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAuthorSave();
                    if (e.key === "Escape") setIsEditingAuthor(false);
                  }}
                />
                <button onClick={handleAuthorSave} className="author-save-btn">
                  Save
                </button>
              </div>
            ) : (
              <div className="author-display">
                <span className="author-label">Author:</span>
                <span className="author-name">{author}</span>
                <button
                  onClick={() => {
                    setTempAuthor(author);
                    setIsEditingAuthor(true);
                  }}
                  className="author-edit-btn"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="track-changes-header">
        <h3>Changes ({changes.length})</h3>
        {changes.length > 0 && (
          <div className="track-changes-actions">
            <button onClick={handleAcceptAll} className="accept-all-btn">
              Accept All
            </button>
            <button onClick={handleRejectAll} className="reject-all-btn">
              Reject All
            </button>
          </div>
        )}
      </div>

      {changes.length === 0 ? (
        <p className="no-changes">No tracked changes in this document.</p>
      ) : (
        <ul className="changes-list">
          {changes.map((change) => (
            <li key={change.id} className={`change-item change-${change.type}`}>
              <div className="change-info">
                <span className={`change-type ${change.type}`}>
                  {change.type === "insertion" ? "Added" : "Deleted"}
                </span>
                <span className="change-text">"{change.text}"</span>
                {change.author && (
                  <span className="change-author">by {change.author}</span>
                )}
                {change.date && (
                  <span className="change-date">{formatDate(change.date)}</span>
                )}
              </div>
              <div className="change-buttons">
                <button
                  onClick={() => handleAccept(change)}
                  className="accept-btn"
                  title="Accept this change"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleReject(change)}
                  className="reject-btn"
                  title="Reject this change"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TrackChangesToolbar;
