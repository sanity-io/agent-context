import {uuid} from '@sanity/uuid'
import {definePlugin, type PluginOptions} from 'sanity'

import {createAgentContextDuplicateAction} from './actions'
import {
  AGENT_CONTEXT_SCHEMA_TITLE,
  AGENT_CONTEXT_SCHEMA_TYPE_NAME,
  agentContextSchema,
} from './agentContextSchema'

/**
 * Default document ID prefix for agent context documents.
 * Document IDs will be formatted as `${prefix}.${uuid}` (e.g., `sanity.agentContext.abc123...`).
 * Documents with a '.' in the ID are hidden from public API queries in public datasets.
 * @beta
 */
export const AGENT_CONTEXT_DEFAULT_DOCUMENT_ID_PREFIX = 'sanity.agentContext'

/**
 * Options for the agent context plugin.
 * @beta
 */
export interface AgentContextPluginOptions {
  /**
   * Document ID prefix for agent context documents.
   * - When a string: Creates document IDs like `${prefix}.${uuid}` (e.g., `sanity.agentContext.abc123...`)
   * - When `null`: Disables prefixing, creates document IDs as just `${uuid}`
   * - When `undefined` or not provided: Uses the default `'sanity.agentContext'` prefix
   * Documents with a '.' in the ID are hidden from public API queries in public datasets.
   * @defaultValue 'sanity.agentContext'
   */
  documentIdPrefix?: string | null
}

/**
 * The plugin for the agent context.
 * @beta
 */
export const agentContextPlugin = definePlugin<AgentContextPluginOptions | void>((options) => {
  // undefined or not provided → use default
  // null → disable prefixing
  // string → use as prefix
  const documentIdPrefix =
    options?.documentIdPrefix === undefined ? AGENT_CONTEXT_DEFAULT_DOCUMENT_ID_PREFIX : options.documentIdPrefix

  if (documentIdPrefix === '') {
    throw new Error(
      `[@sanity/agent-context]: \`documentIdPrefix\` must be a non-empty string or null, but was ""`,
    )
  }

  const plugin = {
    name: 'sanity/agent-context/plugin',
    schema: {
      types: [agentContextSchema],
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
  } satisfies PluginOptions

  return documentIdPrefix === null
    ? plugin
    : {
        ...plugin,
        document: {
          newDocumentOptions: (prev, context) =>
            context.creationContext.type === 'global'
              ? prev.filter((item) => item.templateId !== AGENT_CONTEXT_SCHEMA_TYPE_NAME)
              : prev.map((item) =>
                  item.templateId === AGENT_CONTEXT_SCHEMA_TYPE_NAME
                    ? {...item, initialDocumentId: `${documentIdPrefix}.${uuid()}`}
                    : item,
                ),

          actions: (prev, context) =>
            context.schemaType === AGENT_CONTEXT_SCHEMA_TYPE_NAME
              ? prev.map((action) =>
                  action.action === 'duplicate'
                    ? createAgentContextDuplicateAction(documentIdPrefix)
                    : action,
                )
              : prev,
        },
      }
})
