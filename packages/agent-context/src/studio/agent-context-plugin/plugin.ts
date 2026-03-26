import {definePlugin} from 'sanity'

import {
  CONVERSATION_SCHEMA_TITLE,
  CONVERSATION_SCHEMA_TYPE_NAME,
  conversationSchema,
} from '../insights/schemas/conversationSchema'
import {insightsTool} from '../insights/tool'
import {
  AGENT_CONTEXT_SCHEMA_TITLE,
  AGENT_CONTEXT_SCHEMA_TYPE_NAME,
  agentContextSchema,
} from './agentContextSchema'

/** @public */
export interface InsightsOptions {
  /**
   * Whether to enable the insights feature.
   * @defaultValue true
   */
  enabled?: boolean

  /**
   * Whether to store conversations in the dataset.
   * @defaultValue true
   */
  storeConversations?: boolean
}

/**
 * Plugin options. At least one of `agentContext` or `insights` must be enabled.
 * @public
 */
export type AgentContextPluginOptions =
  | {
      /** Include the `sanity.agentContext` document type. @defaultValue true */
      agentContext?: true
      /** Configuration for insights. Set to `false` to disable. @defaultValue true */
      insights?: InsightsOptions | false
    }
  | {
      /** Include the `sanity.agentContext` document type. @defaultValue true */
      agentContext: false
      /** Configuration for insights. Set to `false` to disable. @defaultValue true */
      insights?: InsightsOptions
    }
  | {
      /** Include the `sanity.agentContext` document type. @defaultValue true */
      agentContext?: boolean
      /** Configuration for insights. Set to `false` to disable. @defaultValue true */
      insights: InsightsOptions
    }

/**
 * The plugin for the agent context.
 * @beta
 */
export const agentContextPlugin = definePlugin<AgentContextPluginOptions | void>((options = {}) => {
  const agentContextEnabled = options?.agentContext !== false
  const insightsConfig = options?.insights
  const insightsEnabled =
    insightsConfig !== false &&
    (typeof insightsConfig !== 'object' || insightsConfig?.enabled !== false)

  const schemaTypes = [
    ...(agentContextEnabled ? [agentContextSchema] : []),
    ...(insightsEnabled ? [conversationSchema] : []),
  ]

  const schemaTemplates = [
    ...(agentContextEnabled
      ? [
          {
            id: AGENT_CONTEXT_SCHEMA_TYPE_NAME,
            title: AGENT_CONTEXT_SCHEMA_TITLE,
            schemaType: AGENT_CONTEXT_SCHEMA_TYPE_NAME,
            value: {},
          },
        ]
      : []),
    ...(insightsEnabled
      ? [
          {
            id: CONVERSATION_SCHEMA_TYPE_NAME,
            title: CONVERSATION_SCHEMA_TITLE,
            schemaType: CONVERSATION_SCHEMA_TYPE_NAME,
            value: {},
          },
        ]
      : []),
  ]

  return {
    name: 'sanity/agent-context/plugin',
    schema: {
      types: schemaTypes,
      templates: (prev) => [...prev, ...schemaTemplates],
    },
    tools: insightsEnabled ? [insightsTool] : [],
  }
})
