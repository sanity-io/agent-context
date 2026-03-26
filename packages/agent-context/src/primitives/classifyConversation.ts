import {generateObject, type LanguageModel} from 'ai'
import type {SanityClient} from 'sanity'
import {z} from 'zod'

import {CONVERSATION_SCHEMA_TYPE_NAME} from '../studio/insights/schemas/conversationSchema'
import type {Message} from './saveConversation'
import {generateKey} from './utils'

/** @public */
export type Sentiment = 'positive' | 'neutral' | 'negative'

/** @public */
export interface CoreMetrics {
  /** How successfully the agent addressed user needs (1-10). */
  successScore: number
  /** Overall emotional tone of the user throughout the conversation. */
  sentiment: Sentiment
  /** Topics where the agent lacked information. Empty if none. */
  contentGaps: string[]
}

/** @internal */
export interface StoredCustomMetric {
  _key: string
  key: string
  stringValue?: string
  numberValue?: number
  booleanValue?: boolean
}

/** @public */
export interface ClassificationResult<TCustom = Record<string, unknown>> {
  coreMetrics: CoreMetrics
  customMetrics?: TCustom
  classifiedAt: string
}

/** @public */
export interface ClassifyConversationOptions<
  TCustom extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
> {
  /** Sanity client with read/write permissions. */
  client: SanityClient
  /** Document ID to classify. */
  conversationId: string
  /** AI SDK model for classification (e.g., `openai('gpt-4o-mini')`). */
  model: LanguageModel
  /** Optional Zod schema for custom metrics. Use `.describe()` for instructions. */
  customMetrics?: TCustom
  /** Optional messages to classify directly (avoids fetching from Sanity). */
  messages?: Message[]
}

const coreMetricsSchema = z.object({
  successScore: z
    .number()
    .describe(
      'Integer from 1-10 indicating how successfully the agent addressed user needs. 1=complete failure, 5=partially addressed, 10=perfect resolution',
    ),
  sentiment: z
    .enum(['positive', 'neutral', 'negative'])
    .describe('Overall emotional tone of the user throughout the conversation'),
  contentGaps: z
    .array(z.string())
    .describe(
      'Topics where the assistant lacked information in its knowledge base. Only include gaps where the assistant could not provide information — not refusals, off-topic requests, or tool errors. Be specific (e.g., "international return policy" not "returns"). Empty array if no content gaps.',
    ),
})

interface StoredMessage {
  role: string
  content: string
}

interface ConversationDocument {
  _id: string
  agentId: string
  threadId: string
  messages: StoredMessage[]
}

/** @internal Exported for testing */
export function formatMessagesForPrompt(messages: StoredMessage[]): string {
  return messages
    .map((m) => {
      const role = m.role.charAt(0).toUpperCase() + m.role.slice(1)
      return `[${role}]: ${m.content || '(no content)'}`
    })
    .join('\n\n')
}

/** @internal Exported for testing */
export function convertCustomMetricsForStorage(
  metrics: Record<string, unknown>,
): StoredCustomMetric[] {
  return Object.entries(metrics).map(([key, value]) => {
    const item: StoredCustomMetric = {
      _key: generateKey(),
      key,
    }

    if (typeof value === 'boolean') {
      item.booleanValue = value
    } else if (typeof value === 'number') {
      item.numberValue = value
    } else if (typeof value === 'string') {
      item.stringValue = value
    } else if (value !== null && value !== undefined) {
      item.stringValue = JSON.stringify(value)
    }

    return item
  })
}

/**
 * Classifies a conversation using AI to extract metrics.
 *
 * This function fetches the conversation, sends it to an AI model for analysis,
 * and stores the classification results back on the document.
 *
 * Core metrics (successScore, sentiment, contentGaps) are always extracted.
 * Custom metrics can be extracted by providing a Zod schema.
 *
 * If classification fails, an error is stored on the document and the error is re-thrown.
 *
 * @example
 * ```ts
 * import {classifyConversation} from '@sanity/agent-context/primitives'
 * import {openai} from '@ai-sdk/openai'
 * import {z} from 'zod'
 *
 * // Classification with custom metrics
 * await classifyConversation({
 *   client: sanityClient,
 *   conversationId: 'agentconversation-support-bot-thread-123',
 *   model: openai('gpt-4o-mini'),
 *   customMetrics: z.object({
 *     escalationNeeded: z.boolean().describe('Whether the user needed a human agent'),
 *     productMentioned: z.string().optional().describe('Product name if mentioned'),
 *   }),
 * })
 * ```
 *
 * @returns The classification result with core and custom metrics.
 * @throws If the conversation doesn't exist, has no messages, or classification fails.
 * @public
 */
export async function classifyConversation<
  TCustom extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
>(
  options: ClassifyConversationOptions<TCustom>,
): Promise<
  ClassificationResult<TCustom extends z.ZodObject<z.ZodRawShape> ? z.infer<TCustom> : undefined>
> {
  const {client, conversationId, model, customMetrics, messages: providedMessages} = options
  const now = new Date().toISOString()

  let messagesToClassify: StoredMessage[]

  if (providedMessages !== undefined) {
    if (providedMessages.length === 0) {
      throw new Error(`Cannot classify conversation with no messages: ${conversationId}`)
    }
    messagesToClassify = providedMessages
  } else {
    const conversation = await client.fetch<ConversationDocument | null>(
      `*[_type == $type && _id == $id][0]{
        _id,
        agentId,
        threadId,
        messages
      }`,
      {type: CONVERSATION_SCHEMA_TYPE_NAME, id: conversationId},
    )

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`)
    }

    if (!conversation.messages || conversation.messages.length === 0) {
      throw new Error(`Conversation has no messages: ${conversationId}`)
    }

    messagesToClassify = conversation.messages
  }

  const combinedSchema = customMetrics
    ? z.object({
        coreMetrics: coreMetricsSchema,
        customMetrics: customMetrics,
      })
    : z.object({
        coreMetrics: coreMetricsSchema,
      })

  // Build the prompt
  const systemPrompt = `You are analyzing a conversation between a user and an AI assistant.
Classify the conversation according to the schema provided.

Guidelines:
- successScore: How well did the assistant resolve the user's needs? 1=complete failure, 5=partially addressed, 10=fully resolved.
- sentiment: The user's overall emotional tone across the entire conversation.
- contentGaps: Topics where the assistant lacked information in its knowledge base. Only include gaps where the assistant could not provide information — not refusals, off-topic requests, or tool errors. Be specific (e.g., "international return policy" not "returns"). Empty array if no content gaps.
${customMetrics ? '\nCustom metrics: Evaluate based on the field descriptions provided in the schema.' : ''}`

  const userPrompt = `Analyze this conversation:

---
${formatMessagesForPrompt(messagesToClassify)}
---`

  try {
    const result = await generateObject({
      model,
      schema: combinedSchema,
      system: systemPrompt,
      prompt: userPrompt,
    })

    const classification = result.object as {
      coreMetrics: CoreMetrics
      customMetrics?: Record<string, unknown>
    }

    const patch: Record<string, unknown> = {
      coreMetrics: classification.coreMetrics,
      classifiedAt: now,
    }

    const classificationCustomMetrics = classification.customMetrics
    if (classificationCustomMetrics && Object.keys(classificationCustomMetrics).length > 0) {
      patch['customMetrics'] = convertCustomMetricsForStorage(classificationCustomMetrics)
    }

    const fieldsToUnset = ['classificationError']
    if (!classificationCustomMetrics || Object.keys(classificationCustomMetrics).length === 0) {
      fieldsToUnset.push('customMetrics')
    }

    await client.patch(conversationId).set(patch).unset(fieldsToUnset).commit()

    return {
      coreMetrics: classification.coreMetrics,
      customMetrics: classification.customMetrics,
      classifiedAt: now,
    } as ClassificationResult<
      TCustom extends z.ZodObject<z.ZodRawShape> ? z.infer<TCustom> : undefined
    >
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Store the error but don't set classifiedAt — this allows the conversation
    // to be picked up again by getConversationsToClassify on the next run.
    // Transient errors (API rate limits, network issues) will resolve themselves.
    try {
      await client.patch(conversationId).set({classificationError: errorMessage}).commit()
    } catch (storageError) {
      console.error('[classifyConversation] Failed to store error on document:', storageError)
    }

    throw error
  }
}
