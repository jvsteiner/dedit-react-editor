export { useDocumentEditor } from "./useDocumentEditor";
export type { UseDocumentEditorReturn } from "./useDocumentEditor";

export { useTrackChanges } from "./useTrackChanges";
export type {
  UseTrackChangesOptions,
  UseTrackChangesReturn,
} from "./useTrackChanges";

export { useComments } from "./useComments";
export type { UseCommentsOptions, UseCommentsReturn } from "./useComments";

export {
  useCollaboration,
  generateUserColor,
  getUserColor,
} from "./useCollaboration";
export type {
  UseCollaborationOptions,
  UseCollaborationReturn,
  CollaborationUser,
} from "./useCollaboration";

export {
  getAuthorColor,
  getAuthorPrimaryColor,
  getAuthorColorStyles,
  AUTHOR_COLORS,
} from "../utils/authorColors";
export type { AuthorColor } from "../utils/authorColors";
