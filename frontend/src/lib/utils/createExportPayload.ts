import type {
  TipTapDocument,
  CommentData,
  ExportOptions,
  ExportPayload,
} from "../types";

/**
 * Create an export payload for the backend API.
 *
 * @example
 * ```tsx
 * const payload = createExportPayload(
 *   editor.getJSON(),
 *   comments,
 *   {
 *     template: { type: 'original', documentId: 'doc-123' },
 *     filename: 'my-document.docx',
 *   }
 * );
 *
 * await fetch('/api/export', {
 *   method: 'POST',
 *   body: JSON.stringify(payload),
 * });
 * ```
 */
export function createExportPayload(
  content: TipTapDocument | Record<string, unknown>,
  comments: CommentData[],
  options: ExportOptions = {}
): ExportPayload {
  const {
    includeComments = true,
    template = { type: "none" },
    filename = "document.docx",
  } = options;

  const payload: ExportPayload = {
    tiptap: content,
    comments: includeComments ? comments : [],
    template: template.type,
    filename,
  };

  // Add document_id if using original template
  if (template.type === "original" && template.documentId) {
    payload.document_id = template.documentId;
  }

  // Add template_id if using custom template
  if (template.type === "custom" && template.templateId) {
    payload.template_id = template.templateId;
  }

  return payload;
}

/**
 * Helper to download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

/**
 * Export document to Word format via API
 *
 * @example
 * ```tsx
 * await exportToWord(
 *   '/api/export',
 *   editor.getJSON(),
 *   comments,
 *   {
 *     template: { type: 'original', documentId: 'doc-123' },
 *     filename: 'my-document.docx',
 *   }
 * );
 * ```
 */
export async function exportToWord(
  apiUrl: string,
  content: TipTapDocument | Record<string, unknown>,
  comments: CommentData[],
  options: ExportOptions = {}
): Promise<void> {
  const payload = createExportPayload(content, comments, options);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Export failed");
  }

  const blob = await response.blob();
  downloadBlob(blob, options.filename || "document.docx");
}
