import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { EditorContent } from "@tiptap/react";

import { useDocumentEditor } from "./hooks/useDocumentEditor";
import { useTrackChanges } from "./hooks/useTrackChanges";
import { useComments } from "./hooks/useComments";
import { createExportPayload } from "./utils/createExportPayload";

import type {
  DocumentEditorProps,
  EditorHandle,
  TipTapDocument,
  TrackedChange,
  ExportOptions,
} from "./types";

/**
 * A flexible, unstyled document editor component with track changes and comments support.
 *
 * @example Basic usage
 * ```tsx
 * <DocumentEditor
 *   initialContent={content}
 *   onChange={(json) => setContent(json)}
 *   className="my-editor"
 * />
 * ```
 *
 * @example With track changes
 * ```tsx
 * const editorRef = useRef<EditorHandle>(null);
 *
 * <DocumentEditor
 *   editorRef={editorRef}
 *   content={content}
 *   onChange={setContent}
 *   trackChanges={{
 *     enabled: true,
 *     author: "John Doe",
 *   }}
 * />
 *
 * // Later: accept all changes
 * editorRef.current?.acceptAllChanges();
 * ```
 *
 * @example With comments
 * ```tsx
 * <DocumentEditor
 *   content={content}
 *   onChange={setContent}
 *   comments={{
 *     data: comments,
 *     onAdd: (range, text) => createComment(range, text),
 *     onResolve: (id) => resolveComment(id),
 *   }}
 * />
 * ```
 */
export const DocumentEditor = forwardRef<EditorHandle, DocumentEditorProps>(
  function DocumentEditor(props, ref) {
    const {
      initialContent,
      content: controlledContent,
      onChange,
      readOnly = false,
      placeholder,
      trackChanges,
      comments,
      className,
      classNames = {},
      style,
      extensions,
      replaceExtensions,
      extensionConfig,
    } = props;

    // Determine if controlled or uncontrolled
    const isControlled = controlledContent !== undefined;
    const effectiveContent = isControlled ? controlledContent : initialContent;

    // Initialize the editor
    const { editor, setContent, focus, blur } = useDocumentEditor({
      initialContent: effectiveContent,
      onChange,
      readOnly,
      placeholder,
      extensions,
      replaceExtensions,
      extensionConfig,
      trackChangesEnabled: trackChanges?.enabled ?? false,
      trackChangesAuthor: trackChanges?.author ?? "Unknown Author",
    });

    // Track changes functionality
    const {
      setEnabled: setTrackChangesEnabled,
      setAuthor: setTrackChangesAuthor,
      changes,
      acceptChange,
      rejectChange,
      acceptAll: acceptAllChanges,
      rejectAll: rejectAllChanges,
    } = useTrackChanges(editor, {
      enabled: trackChanges?.enabled,
      author: trackChanges?.author,
      onAuthorChange: trackChanges?.onAuthorChange,
      onAccept: trackChanges?.onAccept,
      onReject: trackChanges?.onReject,
    });

    // Comments functionality - initialize hook for side effects
    useComments(editor, {
      data: comments?.data,
      onAdd: comments?.onAdd,
      onReply: comments?.onReply,
      onResolve: comments?.onResolve,
      onDelete: comments?.onDelete,
    });

    // Sync controlled content
    useEffect(() => {
      if (isControlled && editor && controlledContent) {
        const currentContent = JSON.stringify(editor.getJSON());
        const newContent = JSON.stringify(controlledContent);
        if (currentContent !== newContent) {
          setContent(controlledContent);
        }
      }
    }, [isControlled, editor, controlledContent, setContent]);

    // Sync track changes props
    useEffect(() => {
      if (trackChanges?.enabled !== undefined) {
        setTrackChangesEnabled(trackChanges.enabled);
      }
    }, [trackChanges?.enabled, setTrackChangesEnabled]);

    useEffect(() => {
      if (trackChanges?.author !== undefined) {
        setTrackChangesAuthor(trackChanges.author);
      }
    }, [trackChanges?.author, setTrackChangesAuthor]);

    // Create the imperative handle
    const getContent = useCallback(():
      | TipTapDocument
      | Record<string, unknown> => {
      return editor?.getJSON() ?? { type: "doc", content: [] };
    }, [editor]);

    const getChanges = useCallback((): TrackedChange[] => {
      return changes;
    }, [changes]);

    const handleAcceptChange = useCallback(
      (changeId: string) => {
        acceptChange(changeId);
      },
      [acceptChange],
    );

    const handleRejectChange = useCallback(
      (changeId: string) => {
        rejectChange(changeId);
      },
      [rejectChange],
    );

    const handleCreateExportPayload = useCallback(
      (options?: ExportOptions) => {
        return createExportPayload(getContent(), comments?.data ?? [], options);
      },
      [getContent, comments?.data],
    );

    useImperativeHandle(
      ref,
      () => ({
        getContent,
        setContent,
        getChanges,
        acceptChange: handleAcceptChange,
        rejectChange: handleRejectChange,
        acceptAllChanges,
        rejectAllChanges,
        setTrackChangesEnabled,
        setTrackChangesAuthor,
        getEditor: () => editor,
        focus,
        blur,
        createExportPayload: handleCreateExportPayload,
      }),
      [
        getContent,
        setContent,
        getChanges,
        handleAcceptChange,
        handleRejectChange,
        acceptAllChanges,
        rejectAllChanges,
        setTrackChangesEnabled,
        setTrackChangesAuthor,
        editor,
        focus,
        blur,
        handleCreateExportPayload,
      ],
    );

    // Build class names
    const rootClassName = useMemo(() => {
      const classes: string[] = [];
      if (className) classes.push(className);
      if (classNames.root) classes.push(classNames.root);
      return classes.join(" ") || undefined;
    }, [className, classNames.root]);

    if (!editor) {
      return null;
    }

    return (
      <div className={rootClassName} style={style}>
        <EditorContent editor={editor} className={classNames.content} />
      </div>
    );
  },
);

export default DocumentEditor;
