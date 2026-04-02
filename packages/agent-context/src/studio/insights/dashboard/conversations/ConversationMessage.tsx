import {RobotIcon, UserIcon} from '@sanity/icons'
import {Box, Card, type CardTone, Flex, Text} from '@sanity/ui'

import type {ConversationMessage as ConversationMessageType} from '../types'

const INLINE_TOOL_CALL_PATTERN = /\s*\[Tool call:\s*\w+\]\s*\{[^}]*\}\s*/g

type MessageRole = ConversationMessageType['role']

const ROLE_ICONS: Record<MessageRole, React.ReactNode> = {
  user: <UserIcon />,
  assistant: <RobotIcon />,
  system: <RobotIcon />,
  tool: <RobotIcon />,
}

const ROLE_TONES: Record<MessageRole, CardTone> = {
  user: 'default',
  assistant: 'transparent',
  system: 'transparent',
  tool: 'transparent',
}

interface ConversationMessageProps {
  message: ConversationMessageType
}

export function ConversationMessage(props: ConversationMessageProps) {
  const {message} = props

  const content = message.content?.replace(INLINE_TOOL_CALL_PATTERN, ' ').trim() || ''

  if (!content) return null

  return (
    <Flex gap={4}>
      <Box paddingTop={4}>
        <Text size={1}>{ROLE_ICONS[message.role]}</Text>
      </Box>

      <Card padding={4} tone={ROLE_TONES[message.role]} border radius={3} flex={1} overflow="auto">
        <Text size={1}>{content}</Text>
      </Card>
    </Flex>
  )
}
