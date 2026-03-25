import type {Sentiment as PrimitiveSentiment} from '../../../primitives/classifyConversation'

/**
 * Sort options for conversation list.
 * @internal
 */
export type SortOption = 'date-desc' | 'date-asc' | 'score-asc' | 'sentiment'

/**
 * Re-export Sentiment from primitives for dashboard use.
 * @internal
 */
export type Sentiment = PrimitiveSentiment

/**
 * Core metrics as they appear on conversation documents.
 * Fields are optional because documents may not be classified yet.
 * @internal
 */
export interface CoreMetrics {
  /** How successfully the agent addressed user needs (1-10) */
  successScore?: number
  /** Overall sentiment of the conversation */
  sentiment?: Sentiment
  /** Topics where the agent lacked information */
  contentGaps?: string[]
}

/**
 * A message in a conversation thread.
 * @internal
 */
export interface ConversationMessage {
  _key: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | null
  timestamp: string | null
}

/**
 * Custom metric stored on the conversation document.
 * @internal
 */
export interface CustomMetric {
  _key: string
  key: string
  stringValue?: string
  numberValue?: number
  booleanValue?: boolean
}
