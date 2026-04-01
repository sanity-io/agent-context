import {CloseIcon} from '@sanity/icons'
import {Box, Button, Card, Container, Flex, Stack, Text} from '@sanity/ui'

import {CONVERSATION_SCHEMA_TYPE_NAME} from '../../schemas/conversationSchema'
import {ErrorBlock} from '../ErrorBlock'
import {LoadingBlock} from '../LoadingBlock'
import type {Conversation} from '../types'
import {useQuery} from '../utils'
import {ConversationMessage} from './ConversationMessage'
import {MetricsCard} from './MetricsCard'

const DETAIL_QUERY = `*[_type == $type && _id == $id][0]{
  _id,
  agentId,
  threadId,
  startedAt,
  updatedAt,
  classifiedAt,
  classificationError,
  coreMetrics,
  "firstMessage": messages[role == "user"][0].content,
  "messages": messages[role in ["user", "assistant"] && !string::startsWith(content, "[Tool call:")]
  }`

interface ConversationDetailProps {
  conversationId: string
  onClose?: () => void
}

export function ConversationDetail(props: ConversationDetailProps) {
  const {conversationId, onClose} = props

  const {
    data: conversation,
    loading,
    error,
    retry,
  } = useQuery<Conversation>(DETAIL_QUERY, {
    type: CONVERSATION_SCHEMA_TYPE_NAME,
    id: conversationId,
  })

  if (loading) {
    return <LoadingBlock message="Loading conversation…" fill />
  }

  if (error) {
    return <ErrorBlock message={`Error loading conversation: ${error}`} fill onRetry={retry} />
  }

  return (
    <Card height="fill" overflow="auto">
      <Stack>
        <Card borderBottom padding={4} paddingTop={3} paddingRight={3}>
          <Stack space={4}>
            <Stack space={3}>
              <Flex align="center" gap={3}>
                <Box flex={1}>
                  <Text size={1} weight="semibold" textOverflow="ellipsis">
                    {conversation?.firstMessage || 'Untitled conversation'}
                  </Text>
                </Box>

                {onClose && (
                  <Button
                    aria-label="Close conversation"
                    icon={CloseIcon}
                    mode="bleed"
                    onClick={onClose}
                    padding={2}
                  />
                )}
              </Flex>

              {conversation && (
                <Box flex={1}>
                  <Stack space={4}>
                    <Stack space={3}>
                      <Text size={0} muted>
                        Agent ID: <b>{conversation.agentId}</b>
                      </Text>

                      <Text size={0} muted>
                        Thread ID: <b>{conversation.threadId}</b>
                      </Text>
                    </Stack>
                  </Stack>
                </Box>
              )}
            </Stack>

            {conversation && (
              <>
                <MetricsCard
                  metrics={conversation.coreMetrics}
                  classifiedAt={conversation.classifiedAt}
                />

                {conversation.classificationError && (
                  <Card padding={3} tone="critical" radius={3}>
                    <Stack space={3}>
                      <Text size={1} weight="medium">
                        Analysis error
                      </Text>

                      <Text size={1}>{conversation.classificationError}</Text>
                    </Stack>
                  </Card>
                )}
              </>
            )}
          </Stack>
        </Card>

        <Container width={1} padding={4} sizing="border">
          {conversation ? (
            <Flex direction="column" gap={3}>
              {conversation.messages?.map((message) => {
                return <ConversationMessage key={message._key} message={message} />
              })}
            </Flex>
          ) : (
            <Card padding={4} height="fill">
              <Flex align="center" justify="center" height="fill">
                <Text size={1} muted align="center">
                  Conversation not found.
                </Text>
              </Flex>
            </Card>
          )}
        </Container>
      </Stack>
    </Card>
  )
}
