import 'server-only'

import {createClient} from '@sanity/client'

if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
  throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is required')
}
if (!process.env.NEXT_PUBLIC_SANITY_DATASET) {
  throw new Error('NEXT_PUBLIC_SANITY_DATASET is required')
}

export const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2026-01-01',
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
  ...(process.env.NEXT_PUBLIC_SANITY_API_HOST && {
    apiHost: process.env.NEXT_PUBLIC_SANITY_API_HOST,
  }),
})
