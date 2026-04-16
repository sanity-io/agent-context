# @sanity/agent-context

## Installation

```bash
npm install @sanity/agent-context
```

## Exports

| Entry point                        | Purpose                                   |
| ---------------------------------- | ----------------------------------------- |
| `@sanity/agent-context/studio`     | Studio plugin and schema type constant    |
| `@sanity/agent-context/ai-sdk`     | AI SDK telemetry integration for Insights |
| `@sanity/agent-context/primitives` | Lower-level APIs for custom workflows     |

## Studio Plugin

Registers a document type for configuring AI agent access to your Sanity content. Each document defines a content filter that scopes what an agent can query.

```ts
// sanity.config.ts
import {defineConfig} from 'sanity'
import {agentContextPlugin} from '@sanity/agent-context/studio'

export default defineConfig({
  // ...
  plugins: [agentContextPlugin()],
})
```

The plugin also exports `AGENT_CONTEXT_SCHEMA_TYPE_NAME` which can be used to configure where the document type appears in the Studio structure:

```ts
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {agentContextPlugin, AGENT_CONTEXT_SCHEMA_TYPE_NAME} from '@sanity/agent-context/studio'

export default defineConfig({
  // ...
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // Filter out agent context document from the default list
            ...S.documentTypeListItems().filter(
              (item) => item.getId() !== AGENT_CONTEXT_SCHEMA_TYPE_NAME,
            ),
            // Add it elsewhere, e.g. after a divider
            S.divider(),
            S.documentTypeListItem(AGENT_CONTEXT_SCHEMA_TYPE_NAME),
          ]),
    }),
    agentContextPlugin(),
  ],
})
```

## Agent Insights

Track and classify your AI agent conversations automatically. Insights captures every conversation, classifies it with AI (success score, sentiment, content gaps), and provides a Studio dashboard for analytics.

### 1. Enable the Plugin

Insights is enabled by default. To disable it:

```ts
agentContextPlugin({insights: {enabled: false}})
```

This registers the `sanity.agentContextConversation` schema and adds an "Agent Insights" dashboard to your Studio.

### 2. Add Telemetry

Connect your AI agent to save conversations automatically:

```ts
import {sanityInsightsIntegration} from '@sanity/agent-context/ai-sdk'
import {convertToModelMessages, streamText} from 'ai'
import {openai} from '@ai-sdk/openai'
import {createClient} from '@sanity/client'

const client = createClient({
  projectId: 'your-project-id',
  dataset: 'production',
  token: process.env.SANITY_WRITE_TOKEN, // Needs write access
  useCdn: false,
  apiVersion: '2024-01-01',
})

const result = await streamText({
  model: openai('gpt-4o'),
  // If using useChat, convert UIMessage[] to ModelMessage[] for streamText
  messages: await convertToModelMessages(messages),
  experimental_telemetry: {
    isEnabled: true,
    integrations: [
      sanityInsightsIntegration({
        client,
        agentId: 'support-agent',
        threadId: conversationId, // Any unique string (session ID, UUID, etc.)
      }),
    ],
  },
})
```

The integration requires a Sanity client with write permissions. Keep the token server-side only.

### 3. Set Up Classification

Run the scaffolding CLI in your Studio directory:

```bash
npx sanity-agent-context init-insights-scheduler
```

This generates a scheduled function that classifies conversations on a configurable frequency (every 10 minutes, 30 minutes, or 1 hour). Follow the printed instructions to deploy:

```bash
pnpm install
npx sanity login
npx sanity functions test classify-conversations --with-user-token  # Test locally
npx sanity blueprints deploy                      # Deploy
```

### Metrics

Every classified conversation includes these standardized metrics:

| Metric         | Type                                    | Description                                  |
| -------------- | --------------------------------------- | -------------------------------------------- |
| `successScore` | `number` (1-10)                         | How well the agent resolved the user's needs |
| `sentiment`    | `'positive' \| 'neutral' \| 'negative'` | Overall user sentiment                       |
| `contentGaps`  | `string[]`                              | Topics where the agent lacked knowledge      |

### Primitives

For custom workflows outside the AI SDK, use the primitives directly:

| Function                     | Purpose                                           |
| ---------------------------- | ------------------------------------------------- |
| `saveConversation`           | Save a conversation without classification        |
| `classifyConversation`       | Classify an existing conversation                 |
| `getConversationsToClassify` | Find conversations needing (re)classification     |
| `generateConversationId`     | Generate deterministic ID from agentId + threadId |

```ts
import {saveConversation, classifyConversation} from '@sanity/agent-context/primitives'
```

### Notes

- **Error handling** — Non-blocking by design. Save/classification failures are logged but don't break the user experience. Check logs for `[sanity-insights]` messages.
- **Concurrency** — Create a fresh `sanityInsightsIntegration()` instance per request. Do not share instances across concurrent requests.
- **Costs** — Classification runs in scheduled batches (every 10 minutes by default) to minimize token usage. Adjust schedule and batch size in your function handler.
