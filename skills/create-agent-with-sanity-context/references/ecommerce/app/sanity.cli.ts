import {config} from 'dotenv'
import {defineCliConfig} from 'sanity/cli'

// Load env from parent directory's .env file
config({path: '../.env'})

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

if (!projectId) {
  throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID environment variable')
}

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
})
