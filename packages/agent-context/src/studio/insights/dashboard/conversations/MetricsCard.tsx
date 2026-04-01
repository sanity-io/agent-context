import {Badge, Box, Card, Flex, Stack, Text} from '@sanity/ui'

import type {Conversation} from '../types'
import {formatSentiment, getScoreTone, getSentimentTone} from '../utils'

interface MetricsCardProps {
  metrics: Conversation['coreMetrics']
  classifiedAt: string | null
}

export function MetricsCard(props: MetricsCardProps) {
  const {metrics, classifiedAt} = props

  const hasMetrics =
    metrics &&
    (metrics.successScore !== undefined ||
      metrics.sentiment ||
      (metrics.contentGaps && metrics.contentGaps.length > 0))

  if (!hasMetrics) {
    return (
      <Card padding={3} tone="caution" radius={3}>
        <Text size={1}>
          {classifiedAt
            ? 'Analysis completed but no metrics were extracted.'
            : 'This conversation has not been analyzed yet.'}
        </Text>
      </Card>
    )
  }

  const formattedClassifiedAt = classifiedAt
    ? new Date(classifiedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null

  return (
    <Stack space={3}>
      <Flex gap={3} align="center" wrap="wrap">
        {metrics.successScore !== undefined && (
          <Flex align="center" gap={2}>
            <Text size={0} muted>
              Score
            </Text>

            <Badge tone={getScoreTone(metrics.successScore)}>{metrics.successScore}/10</Badge>
          </Flex>
        )}

        {metrics.sentiment && (
          <Flex align="center" gap={2}>
            <Text size={0} muted>
              Sentiment
            </Text>

            <Badge tone={getSentimentTone(metrics.sentiment)}>
              {formatSentiment(metrics.sentiment)}
            </Badge>
          </Flex>
        )}

        {metrics.contentGaps && metrics.contentGaps.length > 0 && (
          <Badge tone="caution">
            {`${metrics.contentGaps.length} content ${metrics.contentGaps.length === 1 ? 'gap' : 'gaps'}`}
          </Badge>
        )}

        {formattedClassifiedAt && (
          <>
            <Box flex={1} />

            <Text size={0} muted>
              {formattedClassifiedAt}
            </Text>
          </>
        )}
      </Flex>

      {metrics.contentGaps && metrics.contentGaps.length > 0 && (
        <Flex gap={2} wrap="wrap">
          {metrics.contentGaps.map((gap) => (
            <Text key={gap} size={0} muted>
              • {gap}
            </Text>
          ))}
        </Flex>
      )}
    </Stack>
  )
}
