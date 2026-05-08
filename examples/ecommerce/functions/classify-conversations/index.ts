import {createClient} from '@sanity/client'
import {
  classifyConversation,
  getConversationsToClassify,
  getPreviousContentGaps,
} from '@sanity/agent-context/insights'
import {scheduledEventHandler} from '@sanity/functions'
import {anthropic} from '@ai-sdk/anthropic'

const CONCURRENCY = 5

export const handler = scheduledEventHandler(async ({context}) => {
  // SANITY_PROJECT_ID and SANITY_DATASET are injected by the blueprint's env block.
  // These are example names — adapt to match the user's env var conventions.
  const client = createClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    apiVersion: '2026-01-01',
    token: context.clientOptions?.token,
    useCdn: false,
  })

  if (!client.config().token) {
    console.error('[classify-conversations] No token available')
    return
  }

  const [conversations, previousContentGaps] = await Promise.all([
    getConversationsToClassify({client}),
    getPreviousContentGaps({client}),
  ])

  if (conversations.length === 0) {
    console.log('[classify-conversations] No conversations to classify')
    return
  }

  console.log(`[classify-conversations] Found ${conversations.length} conversations to classify`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < conversations.length; i += CONCURRENCY) {
    const batch = conversations.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (conv) => {
        await classifyConversation({
          client,
          conversationId: conv._id,
          model: anthropic('claude-sonnet-4-5'),
          messages: conv.messages,
          modelProvider: conv.modelProvider,
          modelId: conv.modelId,
          tokenUsage: conv.tokenUsage,
          previousContentGaps,
          telemetry: {
            shareMetrics: true,
            // shareConversations: true,
            // contact: 'you@company.com',
          },
        })
      }),
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        successCount++
      } else {
        errorCount++
        console.error(`[classify-conversations] Failed to classify:`, result.reason)
      }
    }
  }

  console.log(`[classify-conversations] Completed: ${successCount} succeeded, ${errorCount} failed`)
})
