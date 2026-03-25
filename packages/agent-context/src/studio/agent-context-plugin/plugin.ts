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
   * Defaults to true.
   */
  enabled?: boolean

  /**
   * Whether to store conversations in the dataset.
   * Defaults to true.
   */
  storeConversations?: boolean
}

/** @public */
export interface AgentContextPluginOptions {
  /**
   * Configuration for the insights feature.
   * Set to `false` to disable insights entirely.
   */
  insights?: InsightsOptions | false
}

/**
 * The plugin for the agent context.
 * @beta
 */
export const agentContextPlugin = definePlugin<AgentContextPluginOptions | void>((options = {}) => {
  const insightsConfig = options?.insights
  const insightsEnabled = insightsConfig !== false && insightsConfig?.enabled !== false

  return {
    name: 'sanity/agent-context/plugin',

    schema: {
      types: [agentContextSchema, ...(insightsEnabled ? [conversationSchema] : [])],

      // Add template configuration for the `sanity.agentContext` type
      // as the sanity.* namespace is filtered by default.
      templates: (prev) => [
        ...prev,
        {
          id: AGENT_CONTEXT_SCHEMA_TYPE_NAME,
          title: AGENT_CONTEXT_SCHEMA_TITLE,
          schemaType: AGENT_CONTEXT_SCHEMA_TYPE_NAME,
          value: {},
        },
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
      ],
    },

    tools: insightsEnabled ? [insightsTool] : [],
  }
})
