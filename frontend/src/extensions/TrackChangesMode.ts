import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ReplaceStep } from "@tiptap/pm/transform";

export interface TrackChangesModeOptions {
  enabled: boolean;
  author: string;
}

export interface TrackChangesModeStorage {
  enabled: boolean;
  author: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    trackChangesMode: {
      enableTrackChanges: () => ReturnType;
      disableTrackChanges: () => ReturnType;
      toggleTrackChanges: () => ReturnType;
      setTrackChangesAuthor: (author: string) => ReturnType;
    };
  }
}

export const trackChangesModePluginKey = new PluginKey("trackChangesMode");

/**
 * Generate a unique ID for a track change
 */
function generateChangeId(type: "ins" | "del"): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current ISO date string
 */
function getCurrentDate(): string {
  return new Date().toISOString();
}

export const TrackChangesMode = Extension.create<
  TrackChangesModeOptions,
  TrackChangesModeStorage
>({
  name: "trackChangesMode",

  addOptions() {
    return {
      enabled: false,
      author: "Unknown Author",
    };
  },

  addStorage() {
    return {
      enabled: this.options.enabled,
      author: this.options.author,
    };
  },

  addCommands() {
    return {
      enableTrackChanges:
        () =>
        ({ editor }) => {
          this.storage.enabled = true;
          // Trigger a state update to notify React
          editor.view.dispatch(
            editor.state.tr.setMeta("trackChangesEnabled", true),
          );
          return true;
        },
      disableTrackChanges:
        () =>
        ({ editor }) => {
          this.storage.enabled = false;
          editor.view.dispatch(
            editor.state.tr.setMeta("trackChangesEnabled", false),
          );
          return true;
        },
      toggleTrackChanges:
        () =>
        ({ commands }) => {
          if (this.storage.enabled) {
            return commands.disableTrackChanges();
          } else {
            return commands.enableTrackChanges();
          }
        },
      setTrackChangesAuthor: (author: string) => () => {
        this.storage.author = author;
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: trackChangesModePluginKey,

        appendTransaction(transactions, oldState, newState) {
          // Only process if track changes is enabled
          if (!extension.storage.enabled) {
            return null;
          }

          // Skip if no actual document changes
          const hasDocChanges = transactions.some((tr) => tr.docChanged);
          if (!hasDocChanges) {
            return null;
          }

          // Skip transactions that are from track changes itself (prevent infinite loop)
          if (transactions.some((tr) => tr.getMeta("trackChangesProcessed"))) {
            return null;
          }

          // Skip transactions from accept/reject operations
          if (transactions.some((tr) => tr.getMeta("acceptReject"))) {
            return null;
          }

          const author = extension.storage.author;
          const date = getCurrentDate();

          let tr = newState.tr;
          let modified = false;

          // Process each transaction
          for (const transaction of transactions) {
            if (!transaction.docChanged) continue;

            // Analyze each step in the transaction
            for (const step of transaction.steps) {
              if (step instanceof ReplaceStep) {
                const { from, to } = step as ReplaceStep;
                const slice = (step as ReplaceStep).slice;

                // Get the content that was deleted (from old state)
                const deletedContent = oldState.doc.textBetween(
                  from,
                  to,
                  "",
                  "",
                );

                // Get the content that was inserted
                let insertedText = "";
                slice.content.forEach((node) => {
                  if (node.isText) {
                    insertedText += node.text || "";
                  } else if (node.isBlock) {
                    node.content.forEach((child) => {
                      if (child.isText) {
                        insertedText += child.text || "";
                      }
                    });
                  }
                });

                // Handle deletion: We need to revert the deletion and add deletion mark
                if (deletedContent && deletedContent.length > 0) {
                  // The text was already deleted in newState, we need to re-insert it with deletion mark
                  // First, find where the deletion happened in the new document
                  const insertPos = from;

                  // Create a text node with deletion mark
                  const deletionMark = newState.schema.marks.deletion.create({
                    id: generateChangeId("del"),
                    author: author,
                    date: date,
                  });

                  const textNode = newState.schema.text(deletedContent, [
                    deletionMark,
                  ]);

                  // Insert the deleted text back with the deletion mark
                  tr = tr.insert(insertPos, textNode);
                  modified = true;
                }

                // Handle insertion: Add insertion mark to newly inserted text
                if (insertedText && insertedText.length > 0) {
                  // The text is already in newState, we just need to add the insertion mark
                  // Calculate position accounting for any previous insertions in this transaction
                  const mappedFrom = tr.mapping.map(from);
                  const mappedTo = mappedFrom + insertedText.length;

                  const insertionMark = newState.schema.marks.insertion.create({
                    id: generateChangeId("ins"),
                    author: author,
                    date: date,
                  });

                  // Check if this text already has an insertion mark (to avoid double marking)
                  let hasInsertionMark = false;
                  newState.doc.nodesBetween(
                    from,
                    from + insertedText.length,
                    (node) => {
                      if (
                        node.isText &&
                        node.marks.some((m) => m.type.name === "insertion")
                      ) {
                        hasInsertionMark = true;
                      }
                    },
                  );

                  if (!hasInsertionMark) {
                    tr = tr.addMark(mappedFrom, mappedTo, insertionMark);
                    modified = true;
                  }
                }
              }
            }
          }

          if (modified) {
            tr.setMeta("trackChangesProcessed", true);
            return tr;
          }

          return null;
        },
      }),
    ];
  },
});

export default TrackChangesMode;
