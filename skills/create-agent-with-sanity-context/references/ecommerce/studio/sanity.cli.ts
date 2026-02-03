import {defineCliConfig} from 'sanity/cli'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'
const apiHost = process.env.SANITY_STUDIO_API_HOST

if (!projectId) {
  throw new Error('Missing SANITY_STUDIO_PROJECT_ID environment variable')
}

export default defineCliConfig({
  api: {
    projectId,
    dataset,
    ...(apiHost && {apiHost}),
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
  vite: {
    // Load .env from parent directory
    envDir: '..',
  },
})
