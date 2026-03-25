import {type Message, saveConversation} from '@sanity/agent-context/primitives'
import {bindTelemetryIntegration, type TelemetryIntegration} from 'ai'
import type {SanityClient} from 'sanity'

/**
 * Configuration for the Sanity Insights telemetry integration.
 * @public
 */
export interface SanityInsightsConfig {
  /**
   * The Sanity client to use for saving conversations.
   * Must have write permissions to the dataset.
   */
  client: SanityClient

  /**
   * Identifier for the agent. Used to group conversations in the dashboard.
   * Can be a string or a function that returns a string.
   */
  agentId: string | (() => string)

  /**
   * Unique identifier for the conversation thread.
   * Can be a string or a function that returns a string.
   */
  threadId: string | (() => string)
}

interface ModelMessage {
  role: string
  content: unknown
}

interface OnStartEvent {
  messages?: ModelMessage[]
}

interface OnFinishEvent {
  response: {
    messages?: ModelMessage[]
  }
}

function hasStringProperty<K extends string>(
  obj: object,
  key: K,
): obj is object & Record<K, string> {
  return key in obj && typeof (obj as Record<K, unknown>)[key] === 'string'
}

function contentToString(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (typeof part === 'object' && part !== null) {
          if (hasStringProperty(part, 'text')) {
            return part.text
          }

          if (hasStringProperty(part, 'toolName')) {
            if ('result' in part) {
              return `[Tool result: ${part.toolName}: ${JSON.stringify((part as {result: unknown}).result)}]`
            }
            return `[Tool call: ${part.toolName}]`
          }

          if ('result' in part) {
            return `[Tool result: ${JSON.stringify((part as {result: unknown}).result)}]`
          }
        }
        return JSON.stringify(part)
      })
      .join('\n')
  }

  return JSON.stringify(content)
}

function normalizeRole(role: string): Message['role'] {
  switch (role) {
    case 'user':
      return 'user'
    case 'assistant':
      return 'assistant'
    case 'system':
      return 'system'
    case 'tool':
      return 'tool'
    default:
      return 'assistant'
  }
}

/**
 * IMPORTANT: Do not reuse instances across concurrent requests.
 * Always call sanityInsightsIntegration() fresh for each streamText/generateText call.
 */
function createSanityInsightsIntegration(config: SanityInsightsConfig): TelemetryIntegration {
  let inputMessages: Message[] | null = null

  return {
    onStart(event: OnStartEvent): void {
      if (inputMessages !== null) {
        console.warn(
          '[sanity-insights] Integration instance reused before previous request completed. ' +
            'Create a new integration instance for each streamText/generateText call to avoid data corruption.',
        )
      }

      const messages = event.messages ?? []
      inputMessages = messages.map((m) => ({
        role: normalizeRole(m.role),
        content: contentToString(m.content),
      }))
    },

    async onFinish(event: OnFinishEvent): Promise<void> {
      const responseMessages = event.response.messages ?? []

      const formattedResponseMessages: Message[] = responseMessages.map((m) => ({
        role: normalizeRole(m.role),
        content: contentToString(m.content),
      }))

      const capturedInputMessages = inputMessages ?? []
      const allMessages = [...capturedInputMessages, ...formattedResponseMessages]
      inputMessages = null

      if (allMessages.length === 0) {
        return
      }

      const agentId = typeof config.agentId === 'function' ? config.agentId() : config.agentId
      const threadId = typeof config.threadId === 'function' ? config.threadId() : config.threadId

      try {
        await saveConversation({
          client: config.client,
          agentId,
          threadId,
          messages: allMessages,
        })
      } catch (err) {
        console.error('[sanity-insights] Failed to save conversation:', err)
      }
    },
  }
}

/**
 * Creates a telemetry integration that saves conversations to Sanity.
 *
 * Conversations are saved automatically after each AI response. Classification
 * happens separately via scheduled functions - use `npx sanity-agent-context`
 * to set up automated daily classification.
 *
 * @example
 * ```ts
 * import {sanityInsightsIntegration} from '@sanity/agent-context/ai-sdk'
 * import {streamText} from 'ai'
 *
 * const result = await streamText({
 *   model: openai('gpt-4o'),
 *   messages,
 *   experimental_telemetry: {
 *     isEnabled: true,
 *     integrations: [
 *       sanityInsightsIntegration({
 *         client: sanityClient,
 *         agentId: 'my-support-agent',
 *         threadId: threadId,
 *       })
 *     ]
 *   }
 * })
 * ```
 * @public
 */
export function sanityInsightsIntegration(config: SanityInsightsConfig): TelemetryIntegration {
  return bindTelemetryIntegration(createSanityInsightsIntegration(config))
}
