import type {SanityClient} from 'sanity'

import {CONVERSATION_SCHEMA_TYPE_NAME} from '../studio/insights/schemas/conversationSchema'
import {generateKey} from './utils'

/** @public */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

/** @public */
export interface Message {
  /**
   * The role of the message sender.
   */
  role: MessageRole

  /**
   * The content of the message.
   */
  content: string

  /**
   * ISO 8601 timestamp of when the message was sent.
   * If not provided, the current time will be used.
   */
  timestamp?: string
}

/** @public */
export interface SaveConversationOptions {
  /**
   * The Sanity client to use for saving.
   * Must have write permissions to the dataset.
   */
  client: SanityClient

  /**
   * Identifier for the agent that handled this conversation.
   * Used to group conversations by agent in the dashboard.
   */
  agentId: string

  /**
   * Unique identifier for this conversation thread.
   * Used for upserting - subsequent calls with the same threadId
   * will update the existing conversation document.
   */
  threadId: string

  /**
   * The messages in the conversation.
   * On upsert, these replace all existing messages.
   */
  messages: Message[]
}

/**
 * Simple hash function for generating deterministic IDs.
 * @internal
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  // Convert to base36 and ensure positive
  return Math.abs(hash).toString(36)
}

/**
 * Generates a deterministic document ID from agentId and threadId.
 * This ensures the same conversation always maps to the same document.
 *
 * Uses a hash suffix to prevent collisions when different inputs
 * sanitize to the same string (e.g., 'my-agent' vs 'my agent').
 *
 * @example
 * ```ts
 * const id = generateConversationId('support-bot', 'thread-123')
 * // Returns: 'agentconversation-support-bot-thread-123-abc123'
 * ```
 *
 * @public
 */
export function generateConversationId(agentId: string, threadId: string): string {
  // Sanitize inputs to create valid document IDs
  const sanitizedAgentId = agentId.replace(/[^a-zA-Z0-9-_]/g, '-')
  const sanitizedThreadId = threadId.replace(/[^a-zA-Z0-9-_]/g, '-')
  // Add hash suffix to prevent collisions from sanitization
  const hashSuffix = simpleHash(`${agentId}:${threadId}`)
  return `agentconversation-${sanitizedAgentId}-${sanitizedThreadId}-${hashSuffix}`
}

/**
 * Saves or updates a conversation in Sanity.
 *
 * This function uses an upsert pattern:
 * - Creates a new conversation document if one doesn't exist for the threadId
 * - Updates the existing document if it does exist
 *
 * The document ID is deterministic based on agentId and threadId,
 * so repeated calls with the same IDs will update the same document.
 *
 * @example
 * ```ts
 * import {saveConversation} from '@sanity/agent-context/primitives'
 *
 * await saveConversation({
 *   client: sanityClient,
 *   agentId: 'my-support-agent',
 *   threadId: 'thread-123',
 *   messages: [
 *     {role: 'user', content: 'Hello!'},
 *     {role: 'assistant', content: 'Hi there! How can I help?'},
 *   ],
 * })
 * ```
 *
 * @returns The document ID of the saved conversation.
 * @throws Error if required parameters are missing or invalid.
 * @public
 */
export async function saveConversation(options: SaveConversationOptions): Promise<string> {
  const {client, agentId, threadId, messages} = options

  if (!client) {
    throw new Error('saveConversation: client is required')
  }
  if (!agentId || typeof agentId !== 'string') {
    throw new Error('saveConversation: agentId must be a non-empty string')
  }
  if (!threadId || typeof threadId !== 'string') {
    throw new Error('saveConversation: threadId must be a non-empty string')
  }
  if (!Array.isArray(messages)) {
    throw new Error('saveConversation: messages must be an array')
  }
  const now = new Date().toISOString()
  const documentId = generateConversationId(agentId, threadId)

  const formattedMessages = messages.map((m) => ({
    _key: generateKey(),
    role: m.role,
    content: m.content,
    timestamp: m.timestamp ?? now,
  }))

  await client
    .transaction()
    .createIfNotExists({
      _id: documentId,
      _type: CONVERSATION_SCHEMA_TYPE_NAME,
      agentId,
      threadId,
      startedAt: now,
      messages: [],
    })
    .patch(documentId, (p) =>
      p.set({
        messages: formattedMessages,
        updatedAt: now,
      }),
    )
    .commit()

  return documentId
}
