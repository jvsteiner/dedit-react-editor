import { Editor } from "@tiptap/react";
import { useCallback, useState } from "react";

interface Comment {
  id: string;
  author: string;
  date: string;
  text: string;
  replies?: Comment[];
}

interface CommentsPanelProps {
  editor: Editor | null;
  comments: Comment[];
  onReply?: (commentId: string, text: string) => void;
  onDelete?: (commentId: string) => void;
  onResolve?: (commentId: string) => void;
}

export function CommentsPanel({
  editor,
  comments,
  onReply,
  onDelete,
  onResolve,
}: CommentsPanelProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleGoToComment = useCallback(
    (commentId: string) => {
      if (!editor) return;

      const doc = editor.state.doc;
      let found = false;

      doc.descendants((node, pos) => {
        if (found) return false;
        if (node.isText) {
          node.marks.forEach((mark) => {
            if (mark.type.name === "comment" && mark.attrs.commentId === commentId) {
              editor.commands.setTextSelection(pos);
              editor.commands.scrollIntoView();
              found = true;
            }
          });
        }
      });
    },
    [editor],
  );

  const handleStartReply = (commentId: string) => {
    setReplyingTo(commentId);
    setReplyText("");
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText("");
  };

  const handleSubmitReply = (commentId: string) => {
    if (onReply && replyText.trim()) {
      onReply(commentId, replyText.trim());
      setReplyingTo(null);
      setReplyText("");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (!editor) return null;

  return (
    <div className="comments-panel">
      <div className="comments-header">
        <h3>Comments ({comments.length})</h3>
      </div>

      {comments.length === 0 ? (
        <p className="no-comments">No comments in this document.</p>
      ) : (
        <ul className="comments-list">
          {comments.map((comment) => (
            <li key={comment.id} className="comment-item">
              <div className="comment-main">
                <div className="comment-meta">
                  <span className="comment-author">{comment.author}</span>
                  <span className="comment-date">{formatDate(comment.date)}</span>
                </div>
                <div className="comment-text">{comment.text}</div>
                <div className="comment-actions">
                  <button
                    onClick={() => handleGoToComment(comment.id)}
                    className="goto-btn"
                    title="Go to comment location"
                  >
                    Go to
                  </button>
                  {onReply && (
                    <button
                      onClick={() => handleStartReply(comment.id)}
                      className="reply-btn"
                      title="Reply to comment"
                    >
                      Reply
                    </button>
                  )}
                  {onResolve && (
                    <button
                      onClick={() => onResolve(comment.id)}
                      className="resolve-btn"
                      title="Resolve comment"
                    >
                      Resolve
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(comment.id)}
                      className="delete-btn"
                      title="Delete comment"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Reply form */}
              {replyingTo === comment.id && (
                <div className="reply-form">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                  />
                  <div className="reply-buttons">
                    <button
                      onClick={() => handleSubmitReply(comment.id)}
                      className="submit-reply-btn"
                      disabled={!replyText.trim()}
                    >
                      Reply
                    </button>
                    <button onClick={handleCancelReply} className="cancel-reply-btn">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Existing replies */}
              {comment.replies && comment.replies.length > 0 && (
                <ul className="replies-list">
                  {comment.replies.map((reply) => (
                    <li key={reply.id} className="reply-item">
                      <div className="reply-meta">
                        <span className="reply-author">{reply.author}</span>
                        <span className="reply-date">{formatDate(reply.date)}</span>
                      </div>
                      <div className="reply-text">{reply.text}</div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CommentsPanel;
