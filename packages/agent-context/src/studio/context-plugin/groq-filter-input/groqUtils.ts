import {parse} from 'groq-js'

/**
 * Convert a list of type names to a GROQ filter query
 */
export const listToQuery = (types: string[]): string => {
  const quoted = types.map((t) => `"${t}"`).join(', ')
  return `_type in [${quoted}]`
}

/**
 * Parse type names from a GROQ `_type in [...]` query
 */
export const queryToList = (query: string): string[] => {
  const match = query.match(/_type\s+in\s+\[([^\]]*)\]/)
  if (!match?.[1]) return []

  return match[1]
    .split(',')
    .map((s) => s.trim().replace(/"/g, ''))
    .filter(Boolean)
}

/**
 * Check if query is a simple `_type in [...]` filter that can be edited via the Types UI.
 * Returns false for complex queries like `_type in ["a"] && published == true`
 */
export const isSimpleTypeQuery = (query: string | undefined): boolean => {
  if (!query) return true // Empty is simple (can start fresh)
  return /^_type\s+in\s+\[[^\]]*\]$/.test(query.trim())
}

/**
 * Validate a GROQ query string using groq-js parser
 */
export const validateGroq = (query: string | undefined): {valid: boolean; error?: string} => {
  if (!query) return {valid: true}

  try {
    parse(query)
    return {valid: true}
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : 'Invalid GROQ syntax',
    }
  }
}
