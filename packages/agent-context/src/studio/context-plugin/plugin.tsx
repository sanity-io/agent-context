import {definePlugin} from 'sanity'

import {
  AGENT_CONTEXT_SCHEMA_TITLE,
  AGENT_CONTEXT_SCHEMA_TYPE_NAME,
  agentContextSchema,
} from './agentContextSchema'

/**
 * The plugin for the agent context.
 * @beta
 */
export const agentContextPlugin = definePlugin({
  name: 'sanity/agent-context/plugin',

  schema: {
    types: [agentContextSchema],

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
    ],
  },
})
