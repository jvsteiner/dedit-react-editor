import Paragraph from "@tiptap/extension-paragraph";
import { v4 as uuidv4 } from "uuid";

/**
 * Extended Paragraph extension that adds unique IDs to each paragraph.
 * This allows AI edits to target specific paragraphs by ID rather than position.
 */
export const ParagraphWithId = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => {
          // Get existing ID or generate new one
          return element.getAttribute("data-paragraph-id") || uuidv4();
        },
        renderHTML: (attributes) => {
          // Generate ID if not present
          const id = attributes.id || uuidv4();
          return { "data-paragraph-id": id };
        },
      },
    };
  },

  // Hook to ensure all paragraphs get IDs when document is loaded
  onCreate() {
    console.log("[ParagraphWithId] onCreate hook running");
    const { tr } = this.editor.state;
    let modified = false;
    let count = 0;

    this.editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "paragraph") {
        count++;
        if (!node.attrs.id) {
          const newId = uuidv4();
          console.log(
            `[ParagraphWithId] Assigning ID ${newId} to paragraph at pos ${pos}`,
          );
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            id: newId,
          });
          modified = true;
        } else {
          console.log(
            `[ParagraphWithId] Paragraph at pos ${pos} already has ID: ${node.attrs.id}`,
          );
        }
      }
    });

    console.log(
      `[ParagraphWithId] Found ${count} paragraphs, modified: ${modified}`,
    );

    if (modified) {
      this.editor.view.dispatch(tr);
      console.log("[ParagraphWithId] Dispatched transaction");
    }
  },
});

export default ParagraphWithId;
