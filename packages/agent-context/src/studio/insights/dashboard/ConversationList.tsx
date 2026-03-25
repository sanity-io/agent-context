import {CloseIcon} from '@sanity/icons'
import {Badge, Box, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useClient} from 'sanity'

import {CONVERSATION_SCHEMA_TYPE_NAME} from '../schemas/conversationSchema'
import {
  getScoreTone,
  getSentimentTone,
  getStartDateISO,
  SANITY_API_VERSION,
  SENTIMENT_COLORS,
} from './constants'
import type {CoreMetrics, Sentiment, SortOption} from './types'

const SENTIMENT_PRIORITY: Record<Sentiment, number> = {
  negative: 0,
  neutral: 1,
  positive: 2,
}

/**
 * Summary data for a conversation displayed in the list.
 */
interface ConversationSummary {
  _id: string
  agentId: string
  threadId: string
  startedAt: string | null
  updatedAt: string | null
  messageCount: number
  coreMetrics: CoreMetrics | null
}

interface ConversationListProps {
  onSelect: (conversationId: string) => void
  selectedId: string | null
  daysBack: number
  agentFilter: string | null
  threadFilter: string | null
  sortBy: SortOption
  contentGapFilter: string | null
  onClearContentGapFilter: () => void
}

/**
 * List of conversations with filtering by agent ID.
 */
export function ConversationList({
  onSelect,
  selectedId,
  daysBack,
  agentFilter,
  threadFilter,
  sortBy,
  contentGapFilter,
  onClearContentGapFilter,
}: ConversationListProps) {
  const client = useClient({apiVersion: SANITY_API_VERSION})
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fetchIdRef = useRef(0)

  // Derive loading from whether we have fetched for current params
  const [lastFetchParams, setLastFetchParams] = useState<string | null>(null)
  const currentParams = `${daysBack}-${agentFilter}-${threadFilter}-${contentGapFilter}`
  const loading = lastFetchParams !== currentParams

  // Fetch conversations
  useEffect(() => {
    const fetchId = ++fetchIdRef.current
    const paramsKey = `${daysBack}-${agentFilter}-${threadFilter}-${contentGapFilter}`

    const query = `*[_type == $type
      && updatedAt > $startDate
      && ($agentId == null || agentId == $agentId)
      && ($threadId == null || threadId == $threadId)
      && ($contentGapFilter == null || $contentGapFilter in coreMetrics.contentGaps)
    ] | order(updatedAt desc) [0...100] {
      _id,
      agentId,
      threadId,
      startedAt,
      updatedAt,
      "messageCount": count(messages),
      coreMetrics
    }`

    client
      .fetch<ConversationSummary[]>(query, {
        type: CONVERSATION_SCHEMA_TYPE_NAME,
        startDate: getStartDateISO(daysBack),
        agentId: agentFilter ?? null,
        threadId: threadFilter ?? null,
        contentGapFilter: contentGapFilter ?? null,
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
  }, [client, daysBack, agentFilter, threadFilter, contentGapFilter])

  // Sort conversations client-side
  const sortedConversations = useMemo(() => {
    const sorted = [...(conversations ?? [])]

    switch (sortBy) {
      case 'date-desc':
        return sorted.sort(
          (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
        )
      case 'date-asc':
        return sorted.sort(
          (a, b) => new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime(),
        )
      case 'score-asc':
        return sorted.sort(
          (a, b) => (a.coreMetrics?.successScore ?? 11) - (b.coreMetrics?.successScore ?? 11),
        )
      case 'sentiment':
        return sorted.sort((a, b) => {
          const aPriority = SENTIMENT_PRIORITY[a.coreMetrics?.sentiment || 'neutral'] ?? 2
          const bPriority = SENTIMENT_PRIORITY[b.coreMetrics?.sentiment || 'neutral'] ?? 2
          return aPriority - bPriority
        })
      default:
        return sorted
    }
  }, [conversations, sortBy])

  if (loading) {
    return (
      <Card padding={4}>
        <Flex align="center" justify="center" gap={3}>
          <Spinner />

          <Text muted>Loading conversations...</Text>
        </Flex>
      </Card>
    )
  }

  if (error) {
    return (
      <Card padding={4} tone="critical">
        <Text>Error loading conversations: {error}</Text>
      </Card>
    )
  }

  return (
    <Flex direction="column" style={{height: '100%'}}>
      {/* Content gap filter banner */}
      {contentGapFilter && (
        <Box padding={3} style={{borderBottom: '1px solid var(--card-border-color)'}}>
          <Card padding={2} radius={2} tone="caution">
            <Flex align="center" justify="space-between" gap={2}>
              <Text size={1}>
                Filtering by content gap: <strong>{contentGapFilter}</strong>
              </Text>

              <Button
                icon={CloseIcon}
                mode="bleed"
                tone="default"
                onClick={onClearContentGapFilter}
                title="Clear filter"
                padding={2}
              />
            </Flex>
          </Card>
        </Box>
      )}

      {/* Conversation list */}
      <Box style={{flex: 1, overflow: 'auto'}}>
        {sortedConversations.length === 0 ? (
          <Card padding={4}>
            <Stack space={2}>
              <Text muted align="center">
                {(conversations?.length ?? 0) === 0 &&
                !agentFilter &&
                !threadFilter &&
                !contentGapFilter
                  ? 'No conversations recorded yet.'
                  : 'No conversations match your filters.'}
              </Text>

              {(agentFilter || threadFilter || contentGapFilter) && (
                <Text size={1} muted align="center">
                  Try adjusting your filter criteria.
                </Text>
              )}
            </Stack>
          </Card>
        ) : (
          <Stack space={1} padding={2}>
            {sortedConversations.map((conversation) => (
              <ConversationRow
                key={conversation._id}
                conversation={conversation}
                isSelected={conversation._id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Flex>
  )
}

interface ConversationRowProps {
  conversation: ConversationSummary
  isSelected: boolean
  onSelect: (id: string) => void
}

function ConversationRow({conversation, isSelected, onSelect}: ConversationRowProps) {
  const handleClick = useCallback(() => {
    onSelect(conversation._id)
  }, [conversation._id, onSelect])

  const formattedDate = conversation.updatedAt
    ? new Date(conversation.updatedAt).toLocaleDateString()
    : 'Unknown'

  const score = conversation.coreMetrics?.successScore
  const sentiment = conversation.coreMetrics?.sentiment
  const hasContentGaps =
    conversation.coreMetrics?.contentGaps && conversation.coreMetrics.contentGaps.length > 0

  // Left border color based on sentiment
  const borderColor = sentiment ? SENTIMENT_COLORS[sentiment] || 'transparent' : 'transparent'

  return (
    <Card
      as="button"
      padding={3}
      radius={2}
      tone={isSelected ? 'primary' : 'default'}
      onClick={handleClick}
      aria-label={`View conversation with ${conversation.agentId} from ${formattedDate}`}
      aria-pressed={isSelected}
      style={{
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        border: 'none',
        borderLeft: borderColor !== 'transparent' ? `3px solid ${borderColor}` : undefined,
      }}
    >
      <Stack space={3}>
        {/* Header row */}
        <Flex align="center" justify="space-between" gap={2}>
          <Text weight="semibold" size={1}>
            {conversation.agentId}
          </Text>

          <Text size={0} muted>
            {formattedDate}
          </Text>
        </Flex>

        {/* Thread ID */}
        <Text size={0} muted>
          {conversation.threadId}
        </Text>

        {/* Badges row */}
        <Flex align="center" gap={2} wrap="wrap">
          {score !== undefined && (
            <Badge tone={getScoreTone(score)} mode="outline" fontSize={0}>
              {score}/10
            </Badge>
          )}

          {sentiment && (
            <Badge tone={getSentimentTone(sentiment)} fontSize={0}>
              {sentiment}
            </Badge>
          )}

          {hasContentGaps && (
            <Badge tone="caution" fontSize={0}>
              Gap
            </Badge>
          )}

          <Text size={0} muted style={{marginLeft: 'auto'}}>
            {conversation.messageCount} msgs
          </Text>
        </Flex>
      </Stack>
    </Card>
  )
}
