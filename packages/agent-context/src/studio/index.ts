// Add exports here for the `@sanity/agent-context/studio` package
export {
  AGENT_CONTEXT_SCHEMA_TYPE_NAME,
  agentContextSchema,
} from './context-plugin/agentContextSchema'
export {agentContextPlugin} from './context-plugin/plugin'

/**
 * @deprecated Use `agentContextPlugin` instead. Will be removed in next major version.
 */
export {agentContextPlugin as contextPlugin} from './context-plugin/plugin'
