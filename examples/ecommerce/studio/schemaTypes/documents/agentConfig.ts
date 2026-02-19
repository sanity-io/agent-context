import {defineField, defineType} from 'sanity'

export const agentConfig = defineType({
  name: 'agent.config',
  title: 'Agent Configs',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Name for this agent (e.g., "Shopping Assistant")',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Unique identifier used to select this config',
      options: {
        source: 'name',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'systemPrompt',
      title: 'System Prompt',
      type: 'text',
      description:
        'Base instructions for agent behavior (tone, communication style). Implementation-specific instructions are added automatically.',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'slug.current',
    },
  },
})
