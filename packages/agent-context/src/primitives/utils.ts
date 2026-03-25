/**
 * Generates a unique key for Sanity array items.
 * Uses random characters only — Date.now() has millisecond resolution
 * and produces identical values when called in quick succession.
 */
export function generateKey(): string {
  return Math.random().toString(36).slice(2, 11)
}
