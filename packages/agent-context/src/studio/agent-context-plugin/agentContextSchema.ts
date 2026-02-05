import {DatabaseIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {AgentContextDocumentInput} from './agent-context-document-input/AgentContextDocumentInput'
import {GroqFilterInput} from './groq-filter-input/GroqFilterInput'

/**
 * The name of the agent context schema type.
 * @beta
 */
export const AGENT_CONTEXT_SCHEMA_TYPE_NAME = 'sanity.agentContext'

/**
 * The title of the agent context schema type.
 */
export const AGENT_CONTEXT_SCHEMA_TITLE = 'Agent Context'

/**
 * The schema for the agent context document.
 * @beta
 */
export const agentContextSchema = defineType({
  name: AGENT_CONTEXT_SCHEMA_TYPE_NAME,
  title: AGENT_CONTEXT_SCHEMA_TITLE,
  type: 'document',
  icon: DatabaseIcon,
  initialValue: {
    version: '1',
  },
  components: {
    input: AgentContextDocumentInput,
  },
  fields: [
    defineField({
      name: 'version',
      title: 'Version',
      type: 'string',
      hidden: true,
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      placeholder: 'My Agent Context',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
      },
    }),
    defineField({
      name: 'instructions',
      title: 'Instructions',
      description: 'Instructions for the agent to use the context',
      type: 'text',
    }),
    defineField({
      name: 'groqFilter',
      title: 'Content filter',
      description:
        'Control what content AI agents can access. Leave empty for full access, or pick specific document types. Use the GROQ tab for advanced filters.',
      type: 'string',
      components: {
        input: GroqFilterInput,
      },
    }),
  ],
})
