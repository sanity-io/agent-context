import {DatabaseIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {AgentContextDocumentInput} from './AgentContextDocumentInput'
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
  components: {
    input: AgentContextDocumentInput,
  },
  fields: [
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
      name: 'groqFilter',
      title: 'Content filter',
      description:
        'Define which content AI agents can access. Pick types which will generate the filter, or manually enter the filter in the GROQ tab.',
      type: 'string',
      components: {
        input: GroqFilterInput,
      },
    }),
  ],
})
