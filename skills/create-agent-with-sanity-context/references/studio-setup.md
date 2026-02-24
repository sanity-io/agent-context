# Studio Setup

Configure the Sanity Context plugin in your Studio and create agent context documents.

> **Reference Implementation**: See [ecommerce/\_index.md](ecommerce/_index.md) for file navigation, then explore [ecommerce/studio/](ecommerce/studio/).

## Contents

- [Install the Package](#install-the-package)
- [Add the Plugin](#add-the-plugin)
- [Customize Structure Tool](#customize-structure-tool-optional)
- [Create an Agent Context Document](#create-an-agent-context-document)
- [Get the MCP URL](#get-the-mcp-url)
- [Deploy Your Studio](#deploy-your-studio)
- [Create an Agent Config Document](#create-an-agent-config-document-optional)
- [Environment Variables](#environment-variables)
- [Schema Reference](#schema-reference)

---

## Install the Package

```bash
npm install @sanity/agent-context
# or
pnpm add @sanity/agent-context
```

**IMPORTANT: Always check [ecommerce/studio/package.json](ecommerce/studio/package.json) for current working versions.** Key dependencies:

| Package                 | Notes                                     |
| ----------------------- | ----------------------------------------- |
| `@sanity/agent-context` | Use `latest` or check npm for version     |
| `sanity`                | v5.1.0+ required (for server-side schema) |
| `@sanity/vision`        | Must match Sanity version                 |
| `react`, `react-dom`    | React 19                                  |

Do NOT guess versions—check the reference `package.json` or use `npm info <package> version` to get the latest.

## Add the Plugin

See [ecommerce/studio/sanity.config.ts](ecommerce/studio/sanity.config.ts) for a complete example (look for: imports, `plugins` array, `schema.types`).

**Minimal setup:**

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

## Customize Structure Tool (Optional)

To organize agent-related documents in a dedicated section, see [ecommerce/studio/sanity.config.ts](ecommerce/studio/sanity.config.ts) for an example.

## Create an Agent Context Document

In your Studio, create a new `Agent Context` document (type: `sanity.agentContext`) with:

| Field          | Schema field   | Description                                               |
| -------------- | -------------- | --------------------------------------------------------- |
| Name           | `name`         | Display name (e.g., "Product Assistant")                  |
| Slug           | `slug`         | URL identifier, auto-generated from name                  |
| Content Filter | `groqFilter`   | GROQ filter scoping what content the agent can access     |
| Instructions   | `instructions` | Custom instructions for how agents work with your content |

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

## Get the MCP URL

Once your Agent Context document has a slug, the MCP URL appears at the top of the document form:

```
https://api.sanity.io/:apiVersion/agent-context/:projectId/:dataset/:slug
```

Copy this URL—you'll need it when configuring your agent.

## Deploy Your Studio

Agent Context requires a **deployed Studio** (not just running locally) running **v5.1.0+**.

```bash
npx sanity deploy
```

After deploying, open the Studio in your browser to trigger schema deployment.

> **Note:** `sanity schema deploy` is not sufficient — use `sanity deploy`.

## Create an Agent Config Document (Optional)

The reference implementation stores the base system prompt in a Sanity document (`agent.config`). See [ecommerce/studio/schemaTypes/documents/agentConfig.ts](ecommerce/studio/schemaTypes/documents/agentConfig.ts) for the schema.

## Environment Variables

See [ecommerce/studio/.env.example](ecommerce/.env.example) for the template.

Required variables:

```bash
SANITY_STUDIO_PROJECT_ID=your-project-id
SANITY_STUDIO_DATASET=production
```

## Schema Reference

The reference implementation includes a complete e-commerce schema. See [ecommerce/studio/schemaTypes/](ecommerce/studio/schemaTypes/):

- **Documents**: [product.ts](ecommerce/studio/schemaTypes/documents/product.ts), [category.ts](ecommerce/studio/schemaTypes/documents/category.ts), [brand.ts](ecommerce/studio/schemaTypes/documents/brand.ts), [agentConfig.ts](ecommerce/studio/schemaTypes/documents/agentConfig.ts)
- **Objects**: [productVariant.ts](ecommerce/studio/schemaTypes/objects/productVariant.ts), [price.ts](ecommerce/studio/schemaTypes/objects/price.ts), [seo.ts](ecommerce/studio/schemaTypes/objects/seo.ts)

These schemas demonstrate patterns for structured content that agents can query effectively.

## Next Steps

With your Studio configured, deployed, and agent context created, return to the main skill to build your agent implementation.
