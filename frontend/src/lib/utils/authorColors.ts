/**
 * Shared author color palette and utilities.
 * Used for both track changes and collaborative editing cursors.
 */

export interface AuthorColor {
  /** Primary color for text, underlines, strikethroughs, cursors */
  primary: string;
  /** Light background color for deletions (20% opacity version) */
  light: string;
  /** Human-readable name for the color */
  name: string;
}

/**
 * Curated palette of distinct, accessible author colors.
 * Each color has a primary (full saturation) and light (for backgrounds) variant.
 */
export const AUTHOR_COLORS: AuthorColor[] = [
  { primary: "#9333EA", light: "#F3E8FF", name: "purple" },
  { primary: "#2563EB", light: "#DBEAFE", name: "blue" },
  { primary: "#DC2626", light: "#FEE2E2", name: "red" },
  { primary: "#059669", light: "#D1FAE5", name: "green" },
  { primary: "#D97706", light: "#FEF3C7", name: "amber" },
  { primary: "#DB2777", light: "#FCE7F3", name: "pink" },
  { primary: "#0891B2", light: "#CFFAFE", name: "cyan" },
  { primary: "#7C3AED", light: "#EDE9FE", name: "violet" },
  { primary: "#EA580C", light: "#FFEDD5", name: "orange" },
  { primary: "#4F46E5", light: "#E0E7FF", name: "indigo" },
];

/**
 * Simple hash function for strings.
 * Produces a consistent numeric hash for any string input.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a consistent author color based on author name.
 * The same author name will always return the same color.
 *
 * @param authorName - The author's name or identifier
 * @returns The author color object with primary and light variants
 */
export function getAuthorColor(authorName: string): AuthorColor {
  if (!authorName) {
    return AUTHOR_COLORS[0];
  }
  const index = hashString(authorName) % AUTHOR_COLORS.length;
  return AUTHOR_COLORS[index];
}

/**
 * Get just the primary color for an author.
 * Convenience function for collaboration cursors.
 *
 * @param authorName - The author's name or identifier
 * @returns The primary color hex string
 */
export function getAuthorPrimaryColor(authorName: string): string {
  return getAuthorColor(authorName).primary;
}

/**
 * Generate CSS custom properties for an author's colors.
 * These can be applied as inline styles to elements.
 *
 * @param authorName - The author's name or identifier
 * @returns Object with CSS custom property names and values
 */
export function getAuthorColorStyles(authorName: string): Record<string, string> {
  const color = getAuthorColor(authorName);
  return {
    "--author-color": color.primary,
    "--author-color-light": color.light,
  };
}
