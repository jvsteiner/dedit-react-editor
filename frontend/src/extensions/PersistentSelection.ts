import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

// Plugin key for persistent selection
const persistentSelectionKey = new PluginKey("persistentSelection");

/**
 * PersistentSelection - Shows a visual highlight when the editor loses focus
 *
 * This extension preserves the appearance of selected text even when the editor
 * loses focus. Useful for AI editing workflows where users select text, then
 * click on a prompt input to describe what to do with that selection.
 *
 * The extension:
 * - Automatically sets up focus/blur event handlers
 * - Stores the selection range when the editor loses focus
 * - Renders inline decorations with the `.persistent-selection` CSS class
 * - Clears the decorations when the editor regains focus
 *
 * @example
 * ```tsx
 * import { useEditor } from '@tiptap/react';
 * import { PersistentSelection } from 'dedit-react-editor';
 *
 * const editor = useEditor({
 *   extensions: [
 *     // ... other extensions
 *     PersistentSelection,
 *   ],
 * });
 * // That's it! Focus/blur handlers are set up automatically.
 * ```
 *
 * CSS needed (included in dedit-react-editor/styles.css):
 * ```css
 * .tiptap .persistent-selection {
 *   background-color: #dfdfdf;
 *   box-decoration-break: clone;
 *   -webkit-box-decoration-break: clone;
 * }
 * ```
 */
export const PersistentSelection = Extension.create({
  name: "persistentSelection",

  addStorage() {
    return {
      savedSelection: null as { from: number; to: number } | null,
      // Store handler references for cleanup
      _handleFocus: null as (() => void) | null,
      _handleBlur: null as (() => void) | null,
    };
  },

  onCreate() {
    const { editor } = this;

    // Handler to clear persistent selection when editor regains focus
    const handleFocus = () => {
      editor.storage.persistentSelection.savedSelection = null;
      // Force redraw to remove decorations
      editor.view.dispatch(editor.state.tr);
    };

    // Handler to save selection when editor loses focus
    const handleBlur = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        // Only save if there's an actual selection (not just a cursor)
        editor.storage.persistentSelection.savedSelection = { from, to };
        // Force redraw to show decorations
        editor.view.dispatch(editor.state.tr);
      }
    };

    // Store references for cleanup
    editor.storage.persistentSelection._handleFocus = handleFocus;
    editor.storage.persistentSelection._handleBlur = handleBlur;

    // Attach event listeners
    editor.on("focus", handleFocus);
    editor.on("blur", handleBlur);
  },

  onDestroy() {
    const { editor } = this;
    const { _handleFocus, _handleBlur } = editor.storage.persistentSelection;

    // Clean up event listeners
    if (_handleFocus) {
      editor.off("focus", _handleFocus);
    }
    if (_handleBlur) {
      editor.off("blur", _handleBlur);
    }
  },

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        key: persistentSelectionKey,
        props: {
          decorations(state) {
            const saved = extension.storage.savedSelection;
            if (!saved) return DecorationSet.empty;

            const { from, to } = saved;
            // Validate the range is still valid in current doc
            if (from < 0 || to > state.doc.content.size || from >= to) {
              return DecorationSet.empty;
            }

            // Create decorations for each text node in the selection
            // This avoids gaps between block elements
            const decorations: Decoration[] = [];
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (node.isText) {
                const start = Math.max(from, pos);
                const end = Math.min(to, pos + node.nodeSize);
                if (start < end) {
                  decorations.push(
                    Decoration.inline(start, end, {
                      class: "persistent-selection",
                    }),
                  );
                }
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export default PersistentSelection;
