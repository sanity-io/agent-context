# Studio Setup

Configure the Sanity Context plugin in your Studio and create agent context documents.

> **Reference Implementation**: See [ecommerce/\_index.md](ecommerce/_index.md) for file navigation, then explore [ecommerce/studio/](ecommerce/studio/).

## 1. Install the Package

```bash
npm install @sanity/agent-context
# or
pnpm add @sanity/agent-context
```

**IMPORTANT: Always check [ecommerce/studio/package.json](ecommerce/studio/package.json) for current working versions.** Key dependencies:

| Package                 | Version | Notes                                         |
| ----------------------- | ------- | --------------------------------------------- |
| `@sanity/agent-context` | latest  | Use `latest` or check npm for current version |
| `sanity`                | ^5.8.0  | Sanity Studio v5.1+                           |
| `@sanity/vision`        | ^5.8.0  | Must match Sanity version                     |
| `react`                 | ^19     | React 19                                      |
| `react-dom`             | ^19     | React 19                                      |

Do NOT guess versions—check the reference `package.json` or use `npm info <package> version` to get the latest.

## 2. Add the Plugin

See [ecommerce/studio/sanity.config.ts](ecommerce/studio/sanity.config.ts) for a complete example.

**Key parts:**

- **Lines 1-7**: Import the plugin, structure tool types, and markdown plugin
- **Lines 25-58**: Plugin configuration with custom structure (groups agent types under "Agents" section)
- **Lines 60-62**: Schema registration

**Minimal setup** (without custom structure):

```ts
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {agentContextPlugin} from '@sanity/agent-context/studio'

export default defineConfig({
  // ... your config
  plugins: [structureTool(), agentContextPlugin()],
})
```

This registers the `sanity.agentContext` document type in your Studio.

## 3. Customize Structure Tool (Optional)

The reference implementation organizes agent-related documents in a dedicated section. See [ecommerce/studio/sanity.config.ts](ecommerce/studio/sanity.config.ts):

**Key patterns:**

- **Lines 28-34**: Filter agent-related types (`sanity.agentContext`, `agent.config`) from the default document list
- **Lines 36-52**: Group under an "Agents" section with a divider

This keeps your content types organized separately from agent configuration.

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
https://api.sanity.io/:apiVersion/agent-context/:projectId/:dataset/:slug
```

Copy this URL—you'll need it when configuring your agent.

## Environment Variables

See [ecommerce/studio/.env.example](ecommerce/.env.example) for the template.

Required variables:

```bash
SANITY_STUDIO_PROJECT_ID=your-project-id
SANITY_STUDIO_DATASET=production
```

## Schema Reference

The reference implementation includes a complete e-commerce schema. See [ecommerce/studio/schemaTypes/](ecommerce/studio/schemaTypes/):

- **Documents**: [product.ts](ecommerce/studio/schemaTypes/documents/product.ts), [category.ts](ecommerce/studio/schemaTypes/documents/category.ts), [brand.ts](ecommerce/studio/schemaTypes/documents/brand.ts)
- **Objects**: [productVariant.ts](ecommerce/studio/schemaTypes/objects/productVariant.ts), [price.ts](ecommerce/studio/schemaTypes/objects/price.ts), [seo.ts](ecommerce/studio/schemaTypes/objects/seo.ts)

These schemas demonstrate patterns for structured content that agents can query effectively.

## Next Steps

With your Studio configured and agent context created, proceed to [nextjs-agent.md](nextjs-agent.md) to build the agent.
