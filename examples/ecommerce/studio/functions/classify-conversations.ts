import {createClient} from '@sanity/client'
import {classifyConversation, getConversationsToClassify} from '@sanity/agent-context/primitives'
import {scheduledEventHandler} from '@sanity/functions'
import {anthropic} from '@ai-sdk/anthropic'

// Minimum idle time (in minutes) before a conversation is eligible for classification.
// Conversations with messages newer than this are skipped (still active).
const COOLDOWN_MINUTES = 10

// Number of concurrent classification requests.
const CONCURRENCY = 5

export default scheduledEventHandler(async ({context}) => {
  if (!context.clientOptions?.token) {
    console.error('[classify-conversations] No client token available')
    return
  }

  const client = createClient({
    ...context.clientOptions,
    useCdn: false,
  })

  // Find conversations that need classification
  const conversations = await getConversationsToClassify({
    client,
    cooldownMinutes: COOLDOWN_MINUTES,
  })

  if (conversations.length === 0) {
    console.log('[classify-conversations] No conversations to classify')
    return
  }

  console.log(`[classify-conversations] Found ${conversations.length} conversations to classify`)

  let successCount = 0
  let errorCount = 0

  // Process in batches of CONCURRENCY
  for (let i = 0; i < conversations.length; i += CONCURRENCY) {
    const batch = conversations.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (conv) => {
        await classifyConversation({
          client,
          conversationId: conv._id,
          model: anthropic('claude-sonnet-4-5'),
          messages: conv.messages,
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
