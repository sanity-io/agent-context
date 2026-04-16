import {defineBlueprint, defineRobotToken, defineScheduledFunction} from '@sanity/blueprints'
import 'dotenv/config'

export default defineBlueprint({
  resources: [
    defineScheduledFunction({
      name: 'classify-conversations',
      timeout: 600,
      robotToken: '$.resources.classify-conversations-robot.token',
      env: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
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
          resourceId: 'j01klse8',
          roleNames: ['editor'],
        },
      ],
    }),
  ],
})
