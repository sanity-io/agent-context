import type {Sentiment} from './types'

/**
 * Sanity API version used for client queries in the insights dashboard.
 */
export const SANITY_API_VERSION = '2024-01-01'

/**
 * Score threshold constants for success score classification.
 * Scores are on a 1-10 scale where:
 * - 8-10: Good (positive)
 * - 6-7: Okay (caution)
 * - 4-5: Poor
 * - 1-3: Critical
 */
export const SCORE_THRESHOLDS = {
  /** Minimum score considered "good" (8-10) */
  GOOD: 8,
  /** Minimum score considered "okay" (6-7) */
  OKAY: 6,
  /** Maximum score considered "critical" (1-3) */
  CRITICAL_MAX: 3,
  /** Maximum score considered "poor" (4-5) */
  POOR_MAX: 5,
} as const

/**
 * Color palette for sentiment visualization.
 *
 * These colors are used for data visualization (charts, borders) where
 * we need consistent semantic colors that work in both light and dark modes.
 * For component styling, prefer using Sanity UI's `tone` prop instead.
 *
 * Colors are chosen to be accessible and distinguishable:
 * - Green (#43a047): Positive/success states
 * - Blue-gray (#78909c): Neutral/default states
 * - Red (#e53935): Negative/error states
 */
export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: '#43a047',
  neutral: '#78909c',
  negative: '#e53935',
}

/**
 * Color palette for score visualization in charts and graphs.
 *
 * These colors are used for data visualization where we need
 * consistent semantic colors. For component styling, prefer
 * using Sanity UI's `tone` prop with `getScoreTone()` instead.
 */
export const SCORE_COLORS = {
  /** Green - good scores (>= 8) */
  good: '#43a047',
  /** Orange - okay scores (6-7) */
  okay: '#fb8c00',
  /** Red - poor/critical scores (< 6) */
  poor: '#e53935',
  /** Gray - no data */
  noData: '#78909c',
} as const

/**
 * Returns the start of day N days ago as an ISO string.
 * Used for consistent date filtering across dashboard queries.
 */
export function getStartDateISO(daysBack: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysBack)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

/**
 * Returns the appropriate color for a success score.
 */
export function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return SCORE_COLORS.noData
  if (score >= SCORE_THRESHOLDS.GOOD) return SCORE_COLORS.good
  if (score >= SCORE_THRESHOLDS.OKAY) return SCORE_COLORS.okay
  return SCORE_COLORS.poor
}

/**
 * Returns the Sanity UI tone for a success score.
 */
export function getScoreTone(
  score: number | undefined,
): 'default' | 'positive' | 'caution' | 'critical' {
  if (score === undefined) return 'default'
  if (score >= SCORE_THRESHOLDS.GOOD) return 'positive'
  if (score >= SCORE_THRESHOLDS.OKAY) return 'caution'
  return 'critical'
}

/**
 * Categorizes a score into a distribution bucket.
 */
export function getScoreCategory(score: number): 'critical' | 'poor' | 'okay' | 'good' {
  if (score <= SCORE_THRESHOLDS.CRITICAL_MAX) return 'critical'
  if (score <= SCORE_THRESHOLDS.POOR_MAX) return 'poor'
  if (score < SCORE_THRESHOLDS.GOOD) return 'okay'
  return 'good'
}

/**
 * Returns the Sanity UI tone for a sentiment value.
 */
export function getSentimentTone(
  sentiment: Sentiment | undefined,
): 'default' | 'positive' | 'critical' {
  switch (sentiment) {
    case 'positive':
      return 'positive'
    case 'negative':
      return 'critical'
    default:
      return 'default'
  }
}
