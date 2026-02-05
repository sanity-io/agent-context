import {defineBlueprint, defineDocumentFunction} from '@sanity/blueprints'

export default defineBlueprint({
  resources: [
    // defineDocumentFunction({name: 'my-function'}),
    defineDocumentFunction({
      name: 'agent-conversation',
      event: {
        filter:
          '_type == "agent.conversation" && (delta::changedAny(messages) || (delta::operation() == "create") && defined(messages))',
        on: ['create', 'update'],
      },
    }),
  ],
})
