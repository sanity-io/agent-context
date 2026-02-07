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

## Private Document IDs

Agent context documents are created with a `sanity.agentContext.` ID prefix (e.g., `sanity.agentContext.abc123`). The `.` in the ID makes the document private — it will not appear in public API queries on public datasets. This is important because agent context documents may contain sensitive AI instructions.

The plugin automatically enforces the prefix for documents created through the Studio's standard creation flows:

- **Pane header "+" button** — sets `initialDocumentId` with prefix
- **Global "+" menu** — hidden (the global menu does not support custom IDs)
- **Duplicate action** — replaced with a custom action that generates prefixed IDs

### Custom prefix

The default prefix is `sanity.agentContext`. You can change it by passing `documentIdPrefix` to the plugin. A `.` separator is automatically added between the prefix and the UUID:

```ts
agentContextPlugin({documentIdPrefix: 'myPrefix'})
// Documents will have IDs like: myPrefix.abc123...
```

### Creating documents outside Studio

The plugin cannot enforce the prefix when documents are created outside of Studio. If you create `sanity.agentContext` documents via the Sanity Client or HTTP API, you **must** include the prefix in the document ID yourself:

```ts
import {uuid} from '@sanity/uuid'

// Correct — document will be private
client.create({
  _id: `sanity.agentContext.${uuid()}`,
  _type: 'sanity.agentContext',
  // ...
})

// Wrong — document will be publicly queryable
client.create({
  _type: 'sanity.agentContext',
  // ...
})
```

Similarly, if you construct a Studio URL to create a document via intent navigation, include the `id` parameter:

```
/intent/create/template=sanity.agentContext;type=sanity.agentContext;id=sanity.agentContext.<uuid>
```

Without the `id` parameter, Studio will generate a plain UUID without the privacy prefix.
