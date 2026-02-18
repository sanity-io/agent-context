import {DatabaseIcon} from '@sanity/icons'
import {defineField, defineType, type FieldDefinition} from 'sanity'

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
 * Creates the schema for the agent context document, optionally with extra fields appended.
 * @beta
 */
export const createAgentContextSchema = (extraFields: FieldDefinition[] = []) =>
  defineType({
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
        description: 'The name of the agent context',
      }),
      defineField({
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        validation: (Rule) => Rule.required(),
        description:
          'The slug of the agent context. This is used to identify the agent context in the MCP URL.',
        options: {
          source: 'name',
        },
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
      defineField({
        name: 'instructions',
        title: 'Instructions',
        description: 'Custom instructions for how AI agents should work with your content.',
        type: 'text',
      }),
      ...extraFields,
    ],
  })

/**
 * The schema for the agent context document.
 * @beta
 */
export const agentContextSchema = createAgentContextSchema()
