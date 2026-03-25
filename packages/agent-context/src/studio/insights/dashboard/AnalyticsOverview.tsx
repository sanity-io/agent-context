import {ChevronRightIcon} from '@sanity/icons'
import {Card, Flex, Grid, Heading, Spinner, Stack, Text} from '@sanity/ui'
import {useEffect, useMemo, useRef, useState} from 'react'
import {useClient} from 'sanity'

import {CONVERSATION_SCHEMA_TYPE_NAME} from '../schemas/conversationSchema'
import {computeAnalyticsStats, type ConversationData} from './analyticsUtils'
import {getStartDateISO, SANITY_API_VERSION} from './constants'

interface AnalyticsOverviewProps {
  daysBack: number
  agentFilter: string | null
  onContentGapClick: (gapDescription: string) => void
}

/**
 * Analytics overview showing aggregated metrics across conversations.
 */
export function AnalyticsOverview({
  daysBack,
  agentFilter,
  onContentGapClick,
}: AnalyticsOverviewProps) {
  const client = useClient({apiVersion: SANITY_API_VERSION})
  const [conversations, setConversations] = useState<ConversationData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fetchIdRef = useRef(0)

  // Derive loading from whether we have data for current params
  const [lastFetchParams, setLastFetchParams] = useState<string | null>(null)
  const currentParams = `${daysBack}-${agentFilter}`
  const loading = lastFetchParams !== currentParams

  // Fetch conversations
  useEffect(() => {
    const fetchId = ++fetchIdRef.current
    const paramsKey = `${daysBack}-${agentFilter}`

    const query = `*[_type == $type 
      && updatedAt > $startDate
      && ($agentId == null || agentId == $agentId)
    ] {
      agentId,
      updatedAt,
      "messageCount": count(messages),
      coreMetrics
    }`

    client
      .fetch<ConversationData[]>(query, {
        type: CONVERSATION_SCHEMA_TYPE_NAME,
        startDate: getStartDateISO(daysBack),
        agentId: agentFilter ?? null,
      })
      .then((data) => {
        if (fetchId === fetchIdRef.current) {
          setConversations(data)
          setError(null)
          setLastFetchParams(paramsKey)
        }
      })
      .catch((err) => {
        if (fetchId === fetchIdRef.current) {
          setError(err.message)
          setLastFetchParams(paramsKey)
        }
      })
  }, [client, daysBack, agentFilter])

  // Compute aggregations
  const stats = useMemo(
    () => computeAnalyticsStats(conversations, daysBack),
    [conversations, daysBack],
  )

  if (loading) {
    return (
      <Card padding={5}>
        <Flex align="center" justify="center" gap={3}>
          <Spinner />

          <Text muted>Loading analytics...</Text>
        </Flex>
      </Card>
    )
  }

  if (error) {
    return (
      <Card padding={4} tone="critical">
        <Text>Error loading analytics: {error}</Text>
      </Card>
    )
  }

  // Empty state when no conversations exist
  if ((conversations?.length ?? 0) === 0 && !agentFilter) {
    return (
      <Card padding={6}>
        <Stack space={5} style={{textAlign: 'center', maxWidth: 480, margin: '0 auto'}}>
          <Stack space={3}>
            <Heading as="h2" size={2}>
              No conversations yet
            </Heading>

            <Text muted size={2}>
              Start tracking your AI agent conversations to see insights here.
            </Text>
          </Stack>

          <Card padding={4} radius={2} tone="transparent" style={{textAlign: 'left'}}>
            <Stack space={3}>
              <Text size={1} weight="semibold">
                Quick setup
              </Text>

              <Text size={1} muted>
                Add the telemetry integration to your AI agent:
              </Text>

              <Card padding={3} radius={2} tone="default">
                <code style={{fontSize: 12}}>
                  {'sanityInsightsIntegration({ client, agentId, threadId })'}
                </code>
              </Card>
            </Stack>
          </Card>
        </Stack>
      </Card>
    )
  }

  return (
    <Stack space={5} padding={4}>
      {/* Key Metrics Grid */}
      <Grid columns={[2, 2, 4]} gap={4}>
        <MetricCard
          label="Total Conversations"
          value={stats.total}
          description={`In last ${daysBack} days`}
        />

        <MetricCard
          label="Average Score"
          value={stats.avgScore !== null ? `${stats.avgScore}/10` : '—'}
          description={stats.scoredCount > 0 ? `${stats.scoredCount} scored` : 'No scores yet'}
          tone={
            stats.avgScore !== null
              ? stats.avgScore >= 8
                ? 'positive'
                : stats.avgScore >= 6
                  ? 'default'
                  : 'caution'
              : 'default'
          }
        />

        <MetricCard
          label="Content Gaps"
          value={stats.contentGaps.length}
          description={stats.contentGaps.length > 0 ? 'Topics to address' : 'No gaps detected'}
          tone={stats.contentGaps.length > 0 ? 'caution' : 'positive'}
        />

        <MetricCard
          label="Negative Sentiment"
          value={stats.negativeCount}
          description={
            stats.total > 0
              ? `${Math.round((stats.negativeCount / stats.total) * 100)}% of total`
              : 'No data'
          }
          tone={stats.negativeCount > 0 ? 'critical' : 'positive'}
        />
      </Grid>

      {/* Score Distribution & Content Gaps */}
      <Grid columns={[1, 1, 2]} gap={4}>
        {/* Score Distribution */}
        <Card padding={4} radius={2} border>
          <Stack space={4}>
            <Flex align="center" justify="space-between">
              <Text size={1} weight="semibold">
                Score Distribution
              </Text>

              <Text size={0} muted>
                {stats.scoredCount} classified
              </Text>
            </Flex>

            {stats.scoredCount > 0 ? (
              <Stack space={3}>
                <DistributionRow
                  label="Good (8-10)"
                  count={stats.scoreDistribution.good}
                  total={stats.scoredCount}
                  tone="positive"
                />

                <DistributionRow
                  label="Okay (6-7)"
                  count={stats.scoreDistribution.okay}
                  total={stats.scoredCount}
                  tone="default"
                />

                <DistributionRow
                  label="Poor (4-5)"
                  count={stats.scoreDistribution.poor}
                  total={stats.scoredCount}
                  tone="caution"
                />

                <DistributionRow
                  label="Critical (1-3)"
                  count={stats.scoreDistribution.critical}
                  total={stats.scoredCount}
                  tone="critical"
                />
              </Stack>
            ) : (
              <Card padding={4} tone="transparent">
                <Text size={1} muted align="center">
                  No classified conversations yet.
                  <br />
                  Enable classification to see score distribution.
                </Text>
              </Card>
            )}
          </Stack>
        </Card>

        {/* Content Gaps */}
        <Card padding={4} radius={2} border>
          <Stack space={4}>
            <Flex align="center" justify="space-between">
              <Text size={1} weight="semibold">
                Content Gaps
              </Text>

              <Text size={0} muted>
                Topics your agent couldn&apos;t address
              </Text>
            </Flex>

            {stats.contentGaps.length > 0 ? (
              <Stack space={2}>
                {stats.contentGaps.map((gap) => (
                  <Card
                    key={gap.description}
                    padding={3}
                    radius={2}
                    tone="caution"
                    as="button"
                    onClick={() => onContentGapClick(gap.description)}
                    aria-label={`Filter by content gap: ${gap.description}`}
                    style={{cursor: 'pointer', textAlign: 'left', width: '100%', border: 'none'}}
                  >
                    <Flex align="center" justify="space-between" gap={2}>
                      <Text size={1}>{gap.description}</Text>

                      <Flex align="center" gap={2}>
                        <Text size={0} muted>
                          {`${gap.count} ${gap.count === 1 ? 'conversation' : 'conversations'}`}
                        </Text>

                        <ChevronRightIcon style={{fontSize: 16, opacity: 0.6}} />
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Card padding={4} tone="positive" radius={2}>
                <Text size={1} align="center">
                  No content gaps detected — your agent has the information it needs.
                </Text>
              </Card>
            )}
          </Stack>
        </Card>
      </Grid>
    </Stack>
  )
}

interface MetricCardProps {
  label: string
  value: number | string
  description?: string
  tone?: 'default' | 'caution' | 'critical' | 'positive'
}

function MetricCard({label, value, description, tone = 'default'}: MetricCardProps) {
  return (
    <Card padding={4} radius={2} border tone={tone}>
      <Stack space={2}>
        <Text size={4} weight="semibold">
          {value}
        </Text>

        <Stack space={1}>
          <Text size={1} weight="medium">
            {label}
          </Text>

          {description && (
            <Text size={0} muted>
              {description}
            </Text>
          )}
        </Stack>
      </Stack>
    </Card>
  )
}

type DistributionTone = 'positive' | 'primary' | 'caution' | 'critical' | 'default'

interface DistributionRowProps {
  label: string
  count: number
  total: number
  tone: DistributionTone
}

// Vibrant colors for distribution bars - designed to be visible on both light and dark backgrounds
const TONE_COLORS: Record<DistributionTone, string> = {
  positive: '#4caf50',
  primary: '#2196f3',
  caution: '#ff9800',
  critical: '#f44336',
  default: '#9e9e9e',
}

function DistributionRow({label, count, total, tone}: DistributionRowProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  const barColor = TONE_COLORS[tone] || TONE_COLORS['default']

  return (
    <Stack space={2}>
      <Flex gap={3} align="center" justify="space-between">
        <Text size={1} weight="medium">
          {label}
        </Text>

        <Flex align="center" gap={2}>
          <Text size={1} weight="semibold">
            {count}
          </Text>

          <Text size={1} muted>
            ({percentage}%)
          </Text>
        </Flex>
      </Flex>

      <div
        style={{
          width: '100%',
          height: 6,
          backgroundColor: 'rgba(128, 128, 128, 0.15)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(percentage, 2)}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 3,
          }}
        />
      </div>
    </Stack>
  )
}
