# Conversation Insights

Track and classify agent conversations using `@sanity/agent-context`. This enables analytics, debugging, and understanding how users interact with your agent.

> **Reference Implementation**: See [ecommerce/\_index.md](ecommerce/_index.md) for file navigation.

## Overview

The Insights system has two parts:

1. **Telemetry Integration** - Automatically saves conversations during chat
2. **Scheduled Classification** - Analyzes conversations with AI on a schedule

The `agentContextPlugin()` includes Insights by default (conversation schema and dashboard). No custom schema needed.

## Setup

### Quick Setup (Recommended)

Run the scaffolding CLI from your Sanity Studio directory:

```bash
npx sanity-agent-context init-insights-scheduler
```

This generates the blueprint, classification function, and updates `package.json`. Then follow the printed next steps.

### Manual Setup

#### 1. Enable Telemetry in Your Chat Route

Add `sanityInsightsIntegration` to your `streamText` call:

```ts
import {sanityInsightsIntegration} from '@sanity/agent-context/ai-sdk'
import {streamText} from 'ai'

const result = streamText({
  model: anthropic('claude-sonnet-4-5'),
  messages,
  experimental_telemetry: {
    isEnabled: true,
    integrations: [
      sanityInsightsIntegration({
        client: writeClient, // Sanity client with write permissions
        agentId: 'my-agent', // Identifier for grouping conversations
        threadId: chatId, // Unique conversation thread ID
      }),
    ],
  },
})
```

See [ecommerce/app/src/app/api/chat/route.ts](ecommerce/app/src/app/api/chat/route.ts) for the complete implementation.

#### 2. Create a Scheduled Classification Function

Create a Sanity Function that classifies conversations on a schedule:

```ts
// studio/functions/classify-conversations.ts
import {anthropic} from '@ai-sdk/anthropic'
import {classifyConversation, getConversationsToClassify} from '@sanity/agent-context/primitives'
import {createClient} from '@sanity/client'
import {scheduledEventHandler} from '@sanity/functions'

const COOLDOWN_MINUTES = 10
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

  const conversations = await getConversationsToClassify({
    client,
    cooldownMinutes: COOLDOWN_MINUTES,
  })

  if (conversations.length === 0) return

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
        })
      }),
    )

    for (const result of results) {
      if (result.status === 'fulfilled') successCount++
      else {
        errorCount++
        console.error('[classify-conversations] Failed:', result.reason)
      }
    }
  }
})
```

See [ecommerce/studio/functions/classify-conversations.ts](ecommerce/studio/functions/classify-conversations.ts) for the complete implementation.

#### 3. Configure the Blueprint

```ts
// studio/sanity.blueprint.ts
import {defineBlueprint, defineScheduleFunction} from '@sanity/blueprints'

export default defineBlueprint({
  resources: [
    defineScheduleFunction({
      name: 'classify-conversations',
      src: 'functions/classify-conversations',
      event: {
        expression: '*/10 * * * *', // Every 10 minutes
      },
    }),
  ],
})
```

See [ecommerce/studio/sanity.blueprint.ts](ecommerce/studio/sanity.blueprint.ts).

#### 4. Deploy

```bash
# Deploy the blueprint
npx sanity blueprints deploy

# Set required secrets
npx sanity functions secrets set ANTHROPIC_API_KEY
```

## How It Works

### Conversation Saving

The `sanityInsightsIntegration` hooks into AI SDK's telemetry system:

- **On request start**: Captures input messages
- **On request finish**: Combines with response messages and saves to Sanity

Conversations are saved as `sanity.agentContextConversation` documents (provided by the plugin).

### Classification

The `getConversationsToClassify` primitive finds conversations that:

- Have never been classified (`classifiedAt` not set)
- Have been updated since last classification (`_updatedAt > classifiedAt`)
- Have been idle for at least `cooldownMinutes` (default 10) to avoid classifying active conversations

The `classifyConversation` primitive:

1. Sends messages to an LLM with a classification prompt
2. Extracts metrics: success score, sentiment, content gaps
3. Updates the conversation document with results

## Primitives Reference

### `sanityInsightsIntegration`

```ts
import {sanityInsightsIntegration} from '@sanity/agent-context/ai-sdk'

sanityInsightsIntegration({
  client: SanityClient, // Write client
  agentId: string | (() => string), // Agent identifier
  threadId: string | (() => string), // Thread identifier
})
```

### `getConversationsToClassify`

```ts
import {getConversationsToClassify} from '@sanity/agent-context/primitives'

const conversations = await getConversationsToClassify({
  client: SanityClient,
  agentId?: string, // Optional filter
  limit?: number, // Optional max results
  cooldownMinutes?: number, // Min idle time before eligible (default 10)
})
```

### `classifyConversation`

```ts
import {classifyConversation} from '@sanity/agent-context/primitives'

await classifyConversation({
  client: SanityClient,
  conversationId: string,
  model: LanguageModel, // Any AI SDK compatible model
  messages: Message[],
})
```

## Opting Out

If you don't need Insights, disable it in the plugin:

```ts
agentContextPlugin({insights: false})
```

This removes the conversation schema and dashboard from your Studio.
