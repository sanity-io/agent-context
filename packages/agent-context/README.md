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

### Custom fields

Pass a `fields` array to append additional fields to the `sanity.agentContext` document type:

```ts
// sanity.config.ts
import {defineConfig, defineField} from 'sanity'
import {agentContextPlugin} from '@sanity/agent-context/studio'

export default defineConfig({
  // ...
  plugins: [
    agentContextPlugin({
      fields: [
        defineField({
          name: 'brand',
          title: 'Brand',
          type: 'reference',
          to: [{type: 'brand'}],
        }),
      ],
    }),
  ],
})
```

The `AgentContextPluginOptions` type is exported for TypeScript consumers:

```ts
import type {AgentContextPluginOptions} from '@sanity/agent-context/studio'
```

The plugin also exports `AGENT_CONTEXT_SCHEMA_TYPE_NAME` which can be used to configure where the document type appears in the Studio structure. Example:

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
