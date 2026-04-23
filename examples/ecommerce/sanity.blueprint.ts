import {defineBlueprint, defineRobotToken, defineScheduledFunction} from '@sanity/blueprints'
import 'dotenv/config'

export default defineBlueprint({
  resources: [
    defineScheduledFunction({
      name: 'classify-conversations',
      timeout: 600,
      robotToken: '$.resources.classify-conversations-robot.token',
      env: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        SANITY_PROJECT_ID: process.env.SANITY_STUDIO_PROJECT_ID,
        SANITY_DATASET: process.env.SANITY_STUDIO_DATASET,
      },
      event: {
        expression: '*/10 * * * *',
      },
    }),
    defineRobotToken({
      name: 'classify-conversations-robot',
      label: 'Classify Conversations Robot',
      memberships: [
        {
          resourceType: 'project',
          resourceId: process.env.SANITY_STUDIO_PROJECT_ID!,
          roleNames: ['editor'],
        },
      ],
    }),
  ],
})
