import {getScoreCategory} from './constants'
import type {CoreMetrics} from './types'

/**
 * Conversation data structure for analytics calculations.
 */
export interface ConversationData {
  agentId: string
  messageCount: number
  updatedAt: string | null
  coreMetrics: CoreMetrics | null
}

/**
 * Daily statistics for activity charts.
 */
export interface DailyStats {
  date: string
  count: number
  avgScore: number | null
}

/**
 * Content gap with frequency count.
 */
export interface ContentGapStats {
  description: string
  count: number
}

/**
 * Score distribution across buckets.
 */
export interface ScoreDistribution {
  critical: number // 1-3
  poor: number // 4-5
  okay: number // 6-7
  good: number // 8-10
}

/**
 * Sentiment distribution counts.
 */
export interface SentimentCounts {
  positive: number
  neutral: number
  negative: number
}

/**
 * Aggregated analytics statistics.
 */
export interface AnalyticsStats {
  total: number
  avgScore: number | null
  avgMessages: number
  sentimentCounts: SentimentCounts
  contentGaps: ContentGapStats[]
  negativeCount: number
  scoreDistribution: ScoreDistribution
  scoredCount: number
  dailyStats: DailyStats[]
}

/**
 * Calculates the average of an array of numbers, rounded to 1 decimal place.
 */
function calculateAverage(numbers: number[]): number | null {
  if (numbers.length === 0) return null
  const sum = numbers.reduce((a, b) => a + b, 0)
  return Math.round((sum / numbers.length) * 10) / 10
}

/**
 * Computes aggregated analytics statistics from conversation data.
 *
 * This is a pure function that can be easily tested.
 *
 * @param conversations - Array of conversation data
 * @param daysBack - Number of days to include in daily stats
 * @returns Aggregated statistics
 */
export function computeAnalyticsStats(
  conversations: ConversationData[] | null,
  daysBack: number,
): AnalyticsStats {
  const data = conversations ?? []
  const total = data.length

  // Calculate average messages per conversation
  const totalMessages = data.reduce((sum, c) => sum + c.messageCount, 0)
  const avgMessages = total > 0 ? Math.round((totalMessages / total) * 10) / 10 : 0

  // Extract scores
  const scores = data
    .map((c) => c.coreMetrics?.successScore)
    .filter((s): s is number => s !== undefined)
  const avgScore = calculateAverage(scores)

  // Count sentiments
  const sentimentCounts: SentimentCounts = {
    positive: 0,
    neutral: 0,
    negative: 0,
  }
  data.forEach((c) => {
    const sentiment = c.coreMetrics?.sentiment
    if (sentiment && sentiment in sentimentCounts) {
      sentimentCounts[sentiment]++
    }
  })

  // Aggregate content gaps
  const contentGapCounts: Record<string, number> = {}
  data.forEach((c) => {
    const gaps = c.coreMetrics?.contentGaps
    if (gaps && gaps.length > 0) {
      gaps.forEach((gap) => {
        contentGapCounts[gap] = (contentGapCounts[gap] || 0) + 1
      })
    }
  })
  const contentGaps = Object.entries(contentGapCounts)
    .map(([description, count]) => ({description, count}))
    .sort((a, b) => b.count - a.count)

  // Score distribution buckets
  const scoreDistribution: ScoreDistribution = {
    critical: 0,
    poor: 0,
    okay: 0,
    good: 0,
  }
  data.forEach((c) => {
    const score = c.coreMetrics?.successScore
    if (score !== undefined) {
      scoreDistribution[getScoreCategory(score)]++
    }
  })

  // Build daily stats
  const dailyMap: Record<string, {count: number; scores: number[]}> = {}

  // Initialize all days in range
  for (let i = 0; i < daysBack; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dailyMap[key] = {count: 0, scores: []}
  }

  // Populate with actual data
  data.forEach((c) => {
    if (c.updatedAt) {
      const key = c.updatedAt.slice(0, 10)
      const dayData = dailyMap[key]
      if (dayData) {
        dayData.count++
        if (c.coreMetrics?.successScore !== undefined) {
          dayData.scores.push(c.coreMetrics.successScore)
        }
      }
    }
  })

  const dailyStats: DailyStats[] = Object.entries(dailyMap)
    .map(([date, dayData]) => ({
      date,
      count: dayData.count,
      avgScore: calculateAverage(dayData.scores),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    total,
    avgScore,
    avgMessages,
    sentimentCounts,
    contentGaps,
    negativeCount: sentimentCounts.negative,
    scoreDistribution,
    scoredCount: scores.length,
    dailyStats,
  }
}
