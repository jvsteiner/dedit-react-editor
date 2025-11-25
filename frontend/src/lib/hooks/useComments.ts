import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import type { CommentData, SelectionRange } from "../types";

export interface UseCommentsOptions {
  /** Comment data array */
  data?: CommentData[];
  /** Called when user creates a comment */
  onAdd?: (range: SelectionRange, text: string) => void;
  /** Called when user replies to a comment */
  onReply?: (commentId: string, text: string) => void;
  /** Called when user resolves a comment */
  onResolve?: (commentId: string) => void;
  /** Called when user deletes a comment */
  onDelete?: (commentId: string) => void;
}

/**
 * Hook for managing comments functionality.
 *
 * @example
 * ```tsx
 * const {
 *   goToComment,
 *   addComment,
 *   removeComment,
 *   getCommentAtCursor,
 *   getSelection,
 * } = useComments(editor, {
 *   data: comments,
 *   onAdd: (range, text) => createComment(range, text),
 *   onResolve: (id) => resolveComment(id),
 * });
 * ```
 */
export function useComments(
  editor: Editor | null,
  options: UseCommentsOptions = {},
) {
  const { data = [], onAdd, onReply, onResolve, onDelete } = options;

  /**
   * Navigate to a comment's location in the document
   */
  const goToComment = useCallback(
    (commentId: string) => {
      if (!editor) return false;

      const doc = editor.state.doc;
      let found = false;

      doc.descendants((node, pos) => {
        if (found) return false;
        if (node.isText) {
          node.marks.forEach((mark) => {
            if (
              mark.type.name === "comment" &&
              mark.attrs.commentId === commentId
            ) {
              editor.commands.setTextSelection(pos);
              editor.commands.scrollIntoView();
              found = true;
            }
          });
        }
      });

      return found;
    },
    [editor],
  );

  /**
   * Get the current text selection range
   */
  const getSelection = useCallback((): SelectionRange | null => {
    if (!editor) return null;

    const { from, to, empty } = editor.state.selection;
    if (empty) return null;

    return { from, to };
  }, [editor]);

  /**
   * Get the selected text
   */
  const getSelectedText = useCallback((): string | null => {
    if (!editor) return null;

    const { from, to, empty } = editor.state.selection;
    if (empty) return null;

    return editor.state.doc.textBetween(from, to, " ");
  }, [editor]);

  /**
   * Add a comment mark to the current selection
   */
  const addCommentMark = useCallback(
    (commentId: string) => {
      if (!editor) return false;

      const { empty } = editor.state.selection;
      if (empty) return false;

      editor.commands.setComment({ commentId });
      return true;
    },
    [editor],
  );

  /**
   * Add a comment - calls onAdd callback and optionally marks the selection
   */
  const addComment = useCallback(
    (text: string, markSelection = true): string | null => {
      if (!editor) return null;

      const range = getSelection();
      if (!range) return null;

      // Generate a unique ID for the comment
      const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Mark the selection if requested
      if (markSelection) {
        addCommentMark(commentId);
      }

      // Call the callback
      onAdd?.(range, text);

      return commentId;
    },
    [editor, getSelection, addCommentMark, onAdd],
  );

  /**
   * Remove a comment mark from the document
   */
  const removeCommentMark = useCallback(
    (commentId: string) => {
      if (!editor) return false;
      return editor.commands.removeComment(commentId);
    },
    [editor],
  );

  /**
   * Delete a comment - removes mark and calls onDelete
   */
  const deleteComment = useCallback(
    (commentId: string) => {
      removeCommentMark(commentId);
      onDelete?.(commentId);
    },
    [removeCommentMark, onDelete],
  );

  /**
   * Resolve a comment - calls onResolve (mark removal is optional)
   */
  const resolveComment = useCallback(
    (commentId: string, removeMark = true) => {
      if (removeMark) {
        removeCommentMark(commentId);
      }
      onResolve?.(commentId);
    },
    [removeCommentMark, onResolve],
  );

  /**
   * Reply to a comment
   */
  const replyToComment = useCallback(
    (commentId: string, text: string) => {
      onReply?.(commentId, text);
    },
    [onReply],
  );

  /**
   * Get the comment ID at the current cursor position
   */
  const getCommentAtCursor = useCallback((): string | null => {
    if (!editor) return null;

    const { from } = editor.state.selection;
    const resolvedPos = editor.state.doc.resolve(from);
    const marks = resolvedPos.marks();

    for (const mark of marks) {
      if (mark.type.name === "comment" && mark.attrs.commentId) {
        return mark.attrs.commentId;
      }
    }

    return null;
  }, [editor]);

  /**
   * Get comment data by ID
   */
  const getCommentById = useCallback(
    (commentId: string): CommentData | undefined => {
      return data.find((c) => c.id === commentId);
    },
    [data],
  );

  /**
   * Check if a comment exists in the document (has a mark)
   */
  const hasCommentMark = useCallback(
    (commentId: string): boolean => {
      if (!editor) return false;

      let found = false;
      editor.state.doc.descendants((node) => {
        if (found) return false;
        if (node.isText) {
          node.marks.forEach((mark) => {
            if (
              mark.type.name === "comment" &&
              mark.attrs.commentId === commentId
            ) {
              found = true;
            }
          });
        }
      });

      return found;
    },
    [editor],
  );

  return {
    /** Comment data */
    comments: data,
    /** Navigate to a comment's location */
    goToComment,
    /** Get current selection range */
    getSelection,
    /** Get selected text */
    getSelectedText,
    /** Add a comment to the current selection */
    addComment,
    /** Add a comment mark without callback */
    addCommentMark,
    /** Remove a comment mark from the document */
    removeCommentMark,
    /** Delete a comment (remove mark + callback) */
    deleteComment,
    /** Resolve a comment */
    resolveComment,
    /** Reply to a comment */
    replyToComment,
    /** Get comment ID at cursor position */
    getCommentAtCursor,
    /** Get comment data by ID */
    getCommentById,
    /** Check if comment has a mark in document */
    hasCommentMark,
  };
}

export type UseCommentsReturn = ReturnType<typeof useComments>;
