import {definePlugin, type FieldDefinition} from 'sanity'

import {
  AGENT_CONTEXT_SCHEMA_TITLE,
  AGENT_CONTEXT_SCHEMA_TYPE_NAME,
  createAgentContextSchema,
} from './agentContextSchema'

/**
 * Options for the agent context plugin.
 * @beta
 */
export interface AgentContextPluginOptions {
  /**
   * Additional fields to append to the `sanity.agentContext` document type.
   */
  fields?: FieldDefinition[]
}

/**
 * The plugin for the agent context.
 * @beta
 */
export const agentContextPlugin = definePlugin<AgentContextPluginOptions | void>((options) => {
  const schema = createAgentContextSchema(options?.fields ?? [])

  return {
    name: 'sanity/agent-context/plugin',

    schema: {
      types: [schema],

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
  }
})
