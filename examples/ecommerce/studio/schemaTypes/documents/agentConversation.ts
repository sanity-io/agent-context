import {defineArrayMember, defineField, defineType} from 'sanity'

export const agentConversation = defineType({
  name: 'agent.conversation',
  title: 'Conversation',
  type: 'document',
  preview: {
    select: {
      title: 'summary',
      subtitle: 'messages',
      successRate: 'classification.successRate',
    },
    prepare({title, successRate}) {
      return {
        title: title,
        subtitle: `${successRate || 0}% success rate`,
      }
    },
  },
  fields: [
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
    }),
    defineField({
      name: 'messages',
      title: 'Messages',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'role',
              title: 'Role',
              type: 'string',
            }),
            defineField({
              name: 'content',
              title: 'Content',
              type: 'text',
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'classification',
      title: 'Classification',
      type: 'object',
      fields: [
        defineField({
          name: 'successRate',
          title: 'Success Rate',
          type: 'number',
          description: '0-100: Did the conversation achieve its goal?',
        }),
        defineField({
          name: 'agentConfusion',
          title: 'Agent Confusion',
          type: 'number',
          description: '0-100: How much did the agent struggle?',
        }),
        defineField({
          name: 'userConfusion',
          title: 'User Confusion',
          type: 'number',
          description: '0-100: How unclear was the user?',
        }),
      ],
    }),
    defineField({
      name: 'contentGap',
      title: 'Content Gap',
      type: 'text',
      description: 'Content that the agent could not find',
    }),
  ],
})
