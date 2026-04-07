import {defineBlueprint, defineScheduleFunction} from '@sanity/blueprints'

export default defineBlueprint({
  resources: [
    defineScheduleFunction({
      name: 'classify-conversations',
      src: 'functions/classify-conversations',
      event: {
        expression: '0 3 * * *', // Daily at 3 AM UTC
      },
    }),
  ],
})
