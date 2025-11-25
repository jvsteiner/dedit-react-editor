import { useEditor, EditorContent, Editor } from "@tiptap/react";
import { useEffect } from "react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

import Section from "../extensions/Section";
import TableWithId from "../extensions/TableWithId";
import { Insertion } from "../extensions/Insertion";
import { Deletion } from "../extensions/Deletion";
import { Comment } from "../extensions/Comment";

interface DocumentEditorProps {
  content: Record<string, unknown> | null;
  onUpdate?: (json: Record<string, unknown>) => void;
  onEditorReady?: (editor: Editor) => void;
}

export function DocumentEditor({
  content,
  onUpdate,
  onEditorReady,
}: DocumentEditorProps) {
  const editor = useEditor(
    {
      extensions: [
        Document,
        Paragraph,
        Text,
        Heading.configure({
          levels: [1, 2, 3, 4, 5, 6],
        }),
        Bold,
        Italic,
        Section,
        TableWithId.configure({
          resizable: false,
        }),
        TableRow,
        TableCell,
        TableHeader,
        Insertion,
        Deletion,
        Comment,
      ],
      content: content || {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Upload a Word document to begin editing.",
              },
            ],
          },
        ],
      },
      onUpdate: ({ editor }) => {
        if (onUpdate) {
          onUpdate(editor.getJSON());
        }
      },
    },
    [content],
  );

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  if (!editor) {
    return <div className="loading">Loading editor...</div>;
  }

  return <EditorContent editor={editor} className="tiptap" />;
}

export default DocumentEditor;
