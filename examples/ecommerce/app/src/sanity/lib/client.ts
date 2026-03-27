import {createClient} from 'next-sanity'

if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
  throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is required')
}
if (!process.env.NEXT_PUBLIC_SANITY_DATASET) {
  throw new Error('NEXT_PUBLIC_SANITY_DATASET is required')
}

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2026-01-01',
  useCdn: true,
  ...(process.env.NEXT_PUBLIC_SANITY_API_HOST && {
    apiHost: process.env.NEXT_PUBLIC_SANITY_API_HOST,
  }),
})
