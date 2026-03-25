import {ChevronDownIcon, ChevronRightIcon, CloseIcon} from '@sanity/icons'
import {Button, Card, Flex, Heading, Spinner, Stack, Text} from '@sanity/ui'
import {useCallback, useEffect, useRef, useState} from 'react'
import {useClient} from 'sanity'

import {CONVERSATION_SCHEMA_TYPE_NAME} from '../schemas/conversationSchema'
import {SANITY_API_VERSION} from './constants'
import type {ConversationMessage, CoreMetrics, CustomMetric} from './types'

/**
 * Full conversation document structure.
 */
interface Conversation {
  _id: string
  agentId: string
  threadId: string
  startedAt: string | null
  updatedAt: string | null
  classifiedAt: string | null
  classificationError: string | null
  messages: ConversationMessage[]
  coreMetrics: CoreMetrics | null
  customMetrics: CustomMetric[] | null
}

interface ConversationDetailProps {
  conversationId: string
  onClose: () => void
}

/**
 * Detailed view of a single conversation showing messages and metrics.
 */
export function ConversationDetail({conversationId, onClose}: ConversationDetailProps) {
  const client = useClient({apiVersion: SANITY_API_VERSION})
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fetchIdRef = useRef(0)

  // Derive loading from whether we have fetched for current conversationId
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null)
  const loading = lastFetchedId !== conversationId

  useEffect(() => {
    const fetchId = ++fetchIdRef.current
    const query = `*[_type == $type && _id == $id][0]`

    client
      .fetch<Conversation>(query, {type: CONVERSATION_SCHEMA_TYPE_NAME, id: conversationId})
      .then((data) => {
        if (fetchId === fetchIdRef.current) {
          setConversation(data)
          setError(null)
          setLastFetchedId(conversationId)
        }
      })
      .catch((err) => {
        if (fetchId === fetchIdRef.current) {
          setError(err.message)
          setLastFetchedId(conversationId)
        }
      })
  }, [client, conversationId])

  if (loading) {
    return (
      <Card padding={4} height="fill">
        <Flex align="center" justify="center" gap={3} height="fill">
          <Spinner />

          <Text muted>Loading conversation...</Text>
        </Flex>
      </Card>
    )
  }

  if (error) {
    return (
      <Card padding={4} tone="critical" height="fill">
        <Text>Error loading conversation: {error}</Text>
      </Card>
    )
  }

  if (!conversation) {
    return (
      <Card padding={4} height="fill">
        <Text muted>Conversation not found.</Text>
      </Card>
    )
  }

  return (
    <Card height="fill" overflow="auto">
      <Stack space={4} padding={4}>
        {/* Header */}
        <Flex align="center" justify="space-between">
          <Stack space={2}>
            <Heading as="h2" size={1}>
              {conversation.agentId}
            </Heading>

            <Text size={1} muted>
              Thread: {conversation.threadId}
            </Text>
          </Stack>

          <Button icon={CloseIcon} mode="ghost" onClick={onClose} title="Close" />
        </Flex>

        {/* Classification Error */}
        {conversation.classificationError && (
          <Card padding={3} tone="critical" radius={2}>
            <Stack space={2}>
              <Text size={1} weight="semibold">
                Classification Error
              </Text>

              <Text size={1}>{conversation.classificationError}</Text>
            </Stack>
          </Card>
        )}

        {/* Core Metrics */}
        <MetricsCard metrics={conversation.coreMetrics} classifiedAt={conversation.classifiedAt} />

        {/* Custom Metrics */}
        {conversation.customMetrics && conversation.customMetrics.length > 0 && (
          <CustomMetricsCard customMetrics={conversation.customMetrics} />
        )}

        {/* Messages */}
        <Stack space={3}>
          <Text weight="semibold">Messages ({conversation.messages?.length ?? 0})</Text>

          {conversation.messages?.map((message) => (
            <MessageBubble key={message._key} message={message} />
          ))}
        </Stack>
      </Stack>
    </Card>
  )
}

interface MetricsCardProps {
  metrics: Conversation['coreMetrics']
  classifiedAt: string | null
}

function MetricsCard({metrics, classifiedAt}: MetricsCardProps) {
  const hasMetrics =
    metrics &&
    (metrics.successScore !== undefined ||
      metrics.sentiment ||
      (metrics.contentGaps && metrics.contentGaps.length > 0))

  if (!hasMetrics) {
    return (
      <Card padding={3} tone="caution" radius={2}>
        <Text size={1}>
          {classifiedAt
            ? 'Classification completed but no metrics were extracted.'
            : 'This conversation has not been classified yet.'}
        </Text>
      </Card>
    )
  }

  const formatSentiment = (sentiment: string) => {
    return sentiment.charAt(0).toUpperCase() + sentiment.slice(1)
  }

  return (
    <Card padding={3} radius={2} tone="primary">
      <Stack space={3}>
        <Flex align="center" justify="space-between">
          <Text weight="semibold" size={1}>
            Classification Metrics
          </Text>

          {classifiedAt && (
            <Text size={0} muted>
              Classified {new Date(classifiedAt).toLocaleDateString()}
            </Text>
          )}
        </Flex>

        <Flex gap={4} wrap="wrap">
          {metrics.successScore !== undefined && (
            <MetricItem label="Success Score" value={`${metrics.successScore}/10`} />
          )}

          {metrics.sentiment && (
            <MetricItem label="Sentiment" value={formatSentiment(metrics.sentiment)} />
          )}
        </Flex>

        {metrics.contentGaps && metrics.contentGaps.length > 0 && (
          <Card padding={2} tone="caution" radius={2}>
            <Stack space={2}>
              <Text size={1} weight="semibold">
                Content Gaps ({metrics.contentGaps.length})
              </Text>

              {metrics.contentGaps.map((gap) => (
                <Text key={gap} size={1}>
                  - {gap}
                </Text>
              ))}
            </Stack>
          </Card>
        )}
      </Stack>
    </Card>
  )
}

interface CustomMetricsCardProps {
  customMetrics: CustomMetric[]
}

function CustomMetricsCard({customMetrics}: CustomMetricsCardProps) {
  const formatKey = (key: string) => {
    // Convert camelCase to Title Case with spaces
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }

  const renderValue = (metric: CustomMetric) => {
    if (metric.booleanValue !== undefined) {
      return metric.booleanValue ? 'Yes' : 'No'
    }
    if (metric.numberValue !== undefined) {
      return metric.numberValue.toString()
    }
    return metric.stringValue ?? '-'
  }

  const getValueTone = (metric: CustomMetric): 'positive' | 'critical' | 'default' => {
    if (metric.booleanValue !== undefined) {
      return metric.booleanValue ? 'positive' : 'critical'
    }
    return 'default'
  }

  return (
    <Card padding={3} radius={2} tone="transparent" border>
      <Stack space={3}>
        <Text weight="semibold" size={1}>
          Custom Metrics
        </Text>

        <Flex gap={3} wrap="wrap">
          {customMetrics.map((metric) => (
            <Card
              key={metric._key}
              padding={3}
              radius={2}
              tone={getValueTone(metric)}
              style={{minWidth: '120px'}}
            >
              <Stack space={2}>
                <Text size={0} muted>
                  {formatKey(metric.key)}
                </Text>

                <Text size={2} weight="semibold">
                  {renderValue(metric)}
                </Text>
              </Stack>
            </Card>
          ))}
        </Flex>
      </Stack>
    </Card>
  )
}

interface MetricItemProps {
  label: string
  value: string
}

function MetricItem({label, value}: MetricItemProps) {
  return (
    <Stack space={3}>
      <Text size={1} muted>
        {label}
      </Text>

      <Text size={2} weight="semibold">
        {value}
      </Text>
    </Stack>
  )
}

interface MessageBubbleProps {
  message: Conversation['messages'][number]
}

function MessageBubble({message}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const isTool = message.role === 'tool'
  const [expanded, setExpanded] = useState(!isTool) // Tool messages collapsed by default

  const tone = isUser ? 'primary' : isSystem ? 'caution' : isTool ? 'positive' : 'default'

  const formattedTime = message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : null

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  // Truncate content for preview
  const content = message.content ?? ''
  const previewContent = content.length > 80 ? content.slice(0, 80) + '...' : content

  return (
    <Card
      padding={3}
      radius={2}
      tone={tone}
      style={{
        marginLeft: isUser ? 'auto' : 0,
        marginRight: isUser ? 0 : 'auto',
        maxWidth: '80%',
      }}
    >
      <Stack space={2}>
        <Flex align="center" justify="space-between" gap={2}>
          <Flex align="center" gap={1}>
            {isTool && (
              <Button
                icon={expanded ? ChevronDownIcon : ChevronRightIcon}
                mode="bleed"
                padding={1}
                onClick={toggleExpanded}
                title={expanded ? 'Collapse' : 'Expand'}
              />
            )}

            <Text size={0} weight="semibold" muted>
              {message.role}
            </Text>
          </Flex>

          {formattedTime && (
            <Text size={0} muted>
              {formattedTime}
            </Text>
          )}
        </Flex>

        {isTool && !expanded ? (
          <Text
            size={1}
            muted
            role="button"
            tabIndex={0}
            aria-label="Expand tool message"
            style={{cursor: 'pointer'}}
            onClick={toggleExpanded}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleExpanded()
              }
            }}
          >
            {previewContent}
          </Text>
        ) : (
          <Text size={1} style={{whiteSpace: 'pre-wrap'}}>
            {content}
          </Text>
        )}
      </Stack>
    </Card>
  )
}
