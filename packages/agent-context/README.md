# @sanity/agent-context

## Installation

```bash
npm install @sanity/agent-context
```

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
