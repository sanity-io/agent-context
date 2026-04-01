import {defineBlueprint, defineScheduleFunction} from '@sanity/blueprints'

export default defineBlueprint({
  resources: [
    defineScheduleFunction({
      name: 'classify-conversations',
      src: 'functions/classify-conversations',
      event: {
        expression: '0 2 * * *', // Daily at 2 AM UTC
      },
    }),
  ],
})
