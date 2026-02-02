# Studio Setup

Configure the Sanity Context plugin in your Studio and create agent context documents.

## 1. Install the Package

```bash
npm install @sanity/agent-context
# or
pnpm add @sanity/agent-context
```

## 2. Add the Plugin

Add `agentContextPlugin()` to your `sanity.config.ts`:

```ts
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {agentContextPlugin} from '@sanity/agent-context/studio'

import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'My Studio',

  projectId: 'your-project-id',
  dataset: 'production',

  plugins: [structureTool(), agentContextPlugin()],

  schema: {
    types: schemaTypes,
  },
})
```

This registers the `sanity.agentContext` document type in your Studio.

## 3. Customize Structure Tool (Optional)

Organize agent-related documents in a dedicated section:

```ts
import {defineConfig} from 'sanity'
import {structureTool, type StructureBuilder, type ListItemBuilder} from 'sanity/structure'
import {agentContextPlugin, AGENT_CONTEXT_SCHEMA_TYPE_NAME} from '@sanity/agent-context/studio'

import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'My Studio',

  projectId: 'your-project-id',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S: StructureBuilder) => {
        // Filter out agent context from the default list
        const defaultListItems = S.documentTypeListItems().filter(
          (item: ListItemBuilder) => item.getId() !== AGENT_CONTEXT_SCHEMA_TYPE_NAME,
        )

        return S.list()
          .title('Content')
          .items([
            ...defaultListItems,
            S.divider(),
            // Group agent documents together
            S.listItem()
              .title('Agents')
              .child(
                S.list()
                  .title('Agents')
                  .items([
                    S.documentTypeListItem(AGENT_CONTEXT_SCHEMA_TYPE_NAME).title('Agent Contexts'),
                  ]),
              ),
          ])
      },
    }),
    agentContextPlugin(),
  ],

  schema: {
    types: schemaTypes,
  },
})
```

## 4. Create an Agent Context Document

In your Studio, create a new `Agent Context` document with:

| Field              | Description                                               |
| ------------------ | --------------------------------------------------------- |
| **Name**           | Display name for the context (e.g., "Product Assistant")  |
| **Slug**           | URL-friendly identifier, auto-generated from name         |
| **Content Filter** | GROQ filter that scopes what content the agent can access |

### Content Filter Examples

**All documents of specific types:**

```groq
_type in ["article", "product", "category"]
```

**Published content only:**

```groq
_type in ["article", "product"] && !(_id in path("drafts.**"))
```

**Content in a specific language:**

```groq
_type == "article" && language == "en"
```

**Products within a category:**

```groq
_type == "product" && references(*[_type == "category" && slug.current == "electronics"]._id)
```

The filter UI provides two modes:

- **Types tab**: Simple UI to select document types
- **GROQ tab**: Manual entry for complex filters

## 5. Get the MCP URL

Once your Agent Context document has a slug, the MCP URL appears at the top of the document form:

```
https://context-mcp.sanity.io/mcp/:projectId/:dataset/:slug
```

Copy this URL—you'll need it when configuring your agent.

## Environment Variables

Add to your Studio's `.env`:

```bash
SANITY_STUDIO_PROJECT_ID=your-project-id
SANITY_STUDIO_DATASET=production
```

## Next Steps

With your Studio configured and agent context created, proceed to [nextjs-agent.md](nextjs-agent.md) to build the agent.
