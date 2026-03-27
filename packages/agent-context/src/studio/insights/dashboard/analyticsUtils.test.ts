import {describe, expect, it} from 'vitest'

import {computeAnalyticsStats, type ConversationData} from './analyticsUtils'

describe('computeAnalyticsStats', () => {
  it('returns zeros for empty data', () => {
    const stats = computeAnalyticsStats([], 7)

    expect(stats.total).toBe(0)
    expect(stats.avgScore).toBe(null)
    expect(stats.scoredCount).toBe(0)
    expect(stats.negativeCount).toBe(0)
    expect(stats.contentGaps).toEqual([])
    expect(stats.sentimentCounts).toEqual({positive: 0, neutral: 0, negative: 0})
    expect(stats.scoreDistribution).toEqual({critical: 0, poor: 0, okay: 0, good: 0})
  })

  it('handles null conversations', () => {
    const stats = computeAnalyticsStats(null, 7)

    expect(stats.total).toBe(0)
  })

  it('calculates average score correctly', () => {
    const conversations: ConversationData[] = [
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {successScore: 8}},
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {successScore: 6}},
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {successScore: 10}},
    ]

    const stats = computeAnalyticsStats(conversations, 7)

    expect(stats.avgScore).toBe(8) // (8 + 6 + 10) / 3 = 8
    expect(stats.scoredCount).toBe(3)
  })

  it('ignores conversations without scores in average', () => {
    const conversations: ConversationData[] = [
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {successScore: 10}},
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: null},
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {}},
    ]

    const stats = computeAnalyticsStats(conversations, 7)

    expect(stats.avgScore).toBe(10)
    expect(stats.scoredCount).toBe(1)
    expect(stats.total).toBe(3)
  })

  it('counts sentiments correctly', () => {
    const conversations: ConversationData[] = [
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {sentiment: 'positive'}},
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {sentiment: 'positive'}},
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {sentiment: 'negative'}},
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {sentiment: 'neutral'}},
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: null},
    ]

    const stats = computeAnalyticsStats(conversations, 7)

    expect(stats.sentimentCounts).toEqual({positive: 2, neutral: 1, negative: 1})
    expect(stats.negativeCount).toBe(1)
  })

  it('distributes scores into correct buckets', () => {
    const conversations: ConversationData[] = [
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {successScore: 1}}, // critical
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {successScore: 3}}, // critical
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {successScore: 4}}, // poor
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {successScore: 5}}, // poor
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {successScore: 6}}, // okay
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {successScore: 7}}, // okay
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {successScore: 8}}, // good
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {successScore: 10}}, // good
    ]

    const stats = computeAnalyticsStats(conversations, 7)

    expect(stats.scoreDistribution).toEqual({
      critical: 2,
      poor: 2,
      okay: 2,
      good: 2,
    })
  })

  it('aggregates and sorts content gaps by frequency', () => {
    const conversations: ConversationData[] = [
      {
        agentId: 'a',
        messageCount: 1,
        updatedAt: null,
        coreMetrics: {contentGaps: ['pricing', 'shipping']},
      },
      {agentId: 'a', messageCount: 1, updatedAt: null, coreMetrics: {contentGaps: ['pricing']}},
      {
        agentId: 'a',
        messageCount: 1,
        updatedAt: null,
        coreMetrics: {contentGaps: ['returns', 'pricing']},
      },
    ]

    const stats = computeAnalyticsStats(conversations, 7)

    expect(stats.contentGaps).toEqual([
      {description: 'pricing', count: 3},
      {description: 'shipping', count: 1},
      {description: 'returns', count: 1},
    ])
  })

  it('generates daily stats for specified range', () => {
    const stats = computeAnalyticsStats([], 3)

    // Should have 3 days
    expect(stats.dailyStats).toHaveLength(3)
    // Should be sorted by date ascending
    const first = stats.dailyStats[0]
    const second = stats.dailyStats[1]
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(new Date(first!.date).getTime()).toBeLessThan(new Date(second!.date).getTime())
  })

  it('populates daily stats with conversation data', () => {
    const today = new Date().toISOString().slice(0, 10)
    const conversations: ConversationData[] = [
      {
        agentId: 'a',
        messageCount: 1,
        updatedAt: `${today}T10:00:00Z`,
        coreMetrics: {successScore: 8},
      },
      {
        agentId: 'a',
        messageCount: 1,
        updatedAt: `${today}T11:00:00Z`,
        coreMetrics: {successScore: 6},
      },
    ]

    const stats = computeAnalyticsStats(conversations, 7)

    const todayStats = stats.dailyStats.find((d) => d.date === today)
    expect(todayStats).toBeDefined()
    expect(todayStats!.count).toBe(2)
    expect(todayStats!.avgScore).toBe(7) // (8 + 6) / 2
  })
})
