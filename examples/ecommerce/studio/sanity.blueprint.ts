import {defineBlueprint, defineScheduledFunction} from '@sanity/blueprints'

export default defineBlueprint({
  resources: [
    defineScheduledFunction({
      name: 'classify-conversations',
      src: 'functions/classify-conversations',
      event: {
        expression: '0 3 * * *', // Daily at 3 AM UTC
      },
    }),
  ],
})
