# Adding Interactive UI with MCP Apps

Build MCP servers that render interactive HTML widgets inside ChatGPT and Claude, powered by Sanity content via Agent Context MCP.

## What Are MCP Apps

MCP Apps is an open standard for rendering interactive UI widgets inside AI conversations. Both ChatGPT and Claude support it. The core pattern:

1. Your MCP server registers `ui://` resources (HTML bundles) via `registerAppResource()`
2. Your MCP server registers tools linked to those resources via `registerAppTool()` with `_meta.ui.resourceUri`
3. When the LLM calls a tool, the host renders the linked HTML in a sandboxed iframe
4. The iframe communicates with the host via JSON-RPC over postMessage (`ui/*` methods)
5. The iframe can call server tools back, send chat messages, and update model context

**Key packages:**

- `@modelcontextprotocol/sdk` — MCP server and client
- `@modelcontextprotocol/ext-apps` — MCP Apps helpers (`registerAppTool`, `registerAppResource`, `getUiCapability`)

## Architecture: The Wrapper Pattern

Context MCP provides structured content access. Your server wraps it, adding domain-specific UI tools that call upstream internally:

```
ChatGPT / Claude / MCP Inspector
    |
    MCP (Streamable HTTP or stdio)
    |
+-----------------------------------------------+
|  Your MCP UI Server                            |
|                                                |
|  Tools exposed to the LLM:                    |
|    show_products     -> ui://product-grid      |
|    show_product      -> ui://product-card      |
|    compare_products  -> ui://compare           |
|    answer_question   -> text-only              |
|                                                |
|  Internally calls upstream:                    |
|    groq_query, initial_context,               |
|    schema_explorer                             |
+------------------------+-----------------------+
                         |
                         MCP (Streamable HTTP)
                         |
+------------------------+-----------------------+
|  Sanity Agent Context MCP (unchanged)         |
|  api.sanity.io/.../agent-context/...          |
+-----------------------------------------------+
```

**Why wrap instead of exposing upstream tools directly?** Context MCP provides generic data access tools (`groq_query`, `schema_explorer`). Your wrapper server:

- Exposes domain-specific tools with clear intent ("show products" vs "run GROQ query")
- Links each tool to the right UI widget
- Shapes data for both the LLM (concise narration) and the widget (structured content)
- Keeps upstream implementation details hidden from the LLM

**Three response fields:**

| Field               | Who reads it | Purpose                                                                   |
| ------------------- | ------------ | ------------------------------------------------------------------------- |
| `content`           | LLM only     | Text narration ("Found 6 winter jackets")                                 |
| `structuredContent` | LLM + widget | Concise data (product array, comparison fields)                           |
| `_meta`             | Widget only  | Large/private data (image URLs, project config) — never reaches the model |

## Server Setup

### Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.20.2",
    "@modelcontextprotocol/ext-apps": "^1.0.1",
    "zod": "^3.25.76"
  }
}
```

### Upstream Proxy

Connect to the upstream Agent Context MCP using the SDK's client. Create a fresh client per request (stateless):

```typescript
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js'

async function callUpstream(toolName: string, args: Record<string, unknown>) {
  const client = new Client({name: 'my-mcp-ui', version: '1.0.0'}, {capabilities: {}})
  const transport = new StreamableHTTPClientTransport(
    new URL(process.env.SANITY_CONTEXT_MCP_URL!),
    {
      requestInit: {
        headers: {Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`},
      },
    },
  )

  try {
    await client.connect(transport)
    return await client.callTool({name: toolName, arguments: args})
  } finally {
    await client.close().catch(() => {})
  }
}
```

See the ecommerce example: `mcp-ui-server/src/upstream.ts`

### Registering Tools and Resources

```typescript
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server'
import {z} from 'zod'

const server = new McpServer(
  {name: 'my-app', version: '1.0.0'},
  {capabilities: {resources: {}, tools: {}}},
)

// Register a UI resource (HTML bundle)
registerAppResource(
  server,
  'Product Grid',
  'ui://my-app/product-grid.html',
  {
    description: 'Interactive product grid',
    _meta: {
      ui: {
        csp: {
          connectDomains: ['https://api.sanity.io'],
          resourceDomains: ['https://cdn.sanity.io'],
        },
      },
    },
  },
  async () => ({
    contents: [
      {
        uri: 'ui://my-app/product-grid.html',
        mimeType: RESOURCE_MIME_TYPE,
        text: readFileSync('dist/product-grid.html', 'utf-8'),
      },
    ],
  }),
)

// Register a tool linked to the resource
registerAppTool(
  server,
  'show_products',
  {
    description: 'Search and display products',
    inputSchema: {
      query: z.string().describe('Search query'),
      limit: z.number().optional().default(12),
    },
    annotations: {readOnlyHint: true},
    _meta: {
      ui: {resourceUri: 'ui://my-app/product-grid.html'},
    },
  },
  async ({query, limit}) => {
    const result = await callUpstream('groq_query', {
      query: buildGroq(query, limit),
    })
    return {
      content: [{type: 'text', text: `Found products matching "${query}"`}],
      structuredContent: parseResult(result),
      _meta: {sanityProjectId: process.env.SANITY_PROJECT_ID},
    }
  },
)
```

See: `mcp-ui-server/src/server.ts`

### Tool Visibility

Control who can see/call each tool:

- `["model", "app"]` (default) — both LLM and widget can call
- `["app"]` — widget-only (hidden from LLM, useful for pagination)

```typescript
registerAppTool(server, 'load_more', {
  description: 'Load next page',
  _meta: {
    ui: {
      resourceUri: 'ui://my-app/product-grid.html',
      visibility: ['app'], // Widget can call, LLM cannot see
    },
  },
  // ...
})
```

### Tool Annotations

Describe tool behavior to the host:

```typescript
annotations: {
  readOnlyHint: true,     // Only reads data, no side effects
  destructiveHint: false,  // Doesn't delete/overwrite data
  openWorldHint: false,    // Doesn't reach outside user's account
}
```

### Capability Detection

Check if the host supports MCP Apps for graceful degradation:

```typescript
import {getUiCapability, RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server'

// After server initialization
const uiCap = getUiCapability(server.server.getClientCapabilities())
if (uiCap?.mimeTypes?.includes(RESOURCE_MIME_TYPE)) {
  // Host supports MCP Apps — register UI-enhanced tools
} else {
  // Register text-only fallback tools
}
```

## Building UI Bundles

Widgets run in a sandboxed iframe and communicate via postMessage. Build them as single-file HTML bundles using React + Vite + vite-plugin-singlefile.

### MCP Apps Bridge

The bridge handles the JSON-RPC protocol between the widget iframe and the host:

```typescript
// ui/shared/bridge.ts — key functions

// Handshake with the host
await initializeBridge('my-app', '1.0.0')

// React hook: receive tool result data
const {data, meta, isPending} = useToolResult<ProductData>()

// Call a server tool from the widget
await callServerTool('show_product', {productId: 'abc'})

// Send a chat message (triggers LLM response)
sendMessage('Compare this with similar products')

// Open an external link via the host
openLink('https://mysite.com/products/abc')

// Update model context with widget state
updateModelContext({viewing: 'Product ABC'})
```

See: `mcp-ui-server/ui/shared/bridge.ts`

### Widget Pattern

Each widget is a React app in its own directory:

```
ui/product-grid/
  index.html    # Entry point (<div id="root"> + <script src="./App.tsx">)
  App.tsx       # React component
```

```tsx
// ui/product-grid/App.tsx
import '../shared/styles.css'
import {createRoot} from 'react-dom/client'
import {initializeBridge, useToolResult, callServerTool} from '../shared/bridge'
import {sanityImageUrl} from '../shared/sanity-image'

function ProductGrid() {
  const {data, meta, isPending} = useToolResult<GridData>()

  if (isPending) return <div className="loading">Searching</div>

  return (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))'}}>
      {data.products.map((product) => (
        <div
          key={product._id}
          onClick={() => callServerTool('show_product', {productId: product._id})}
          data-llm={`Product: ${product.title}, $${product.price.amount}`}
        >
          <img src={sanityImageUrl(product.image, meta.sanityProjectId, meta.sanityDataset)} />
          <h3>{product.title}</h3>
          <span>${product.price.amount}</span>
        </div>
      ))}
    </div>
  )
}

initializeBridge('product-grid', '1.0.0')
createRoot(document.getElementById('root')!).render(<ProductGrid />)
```

### Sanity Image URLs

Build CDN URLs from Sanity asset references passed via `_meta`:

```typescript
// ui/shared/sanity-image.ts
function sanityImageUrl(asset, projectId, dataset, options?) {
  // Parses _ref: "image-{id}-{w}x{h}-{format}"
  // Returns: https://cdn.sanity.io/images/{projectId}/{dataset}/{id}-{w}x{h}.{format}?w=400
}
```

### Host Theme Variables

Widgets can use CSS variables injected by the host for theme matching:

```css
:root {
  --color-text-primary: var(--host-color-text-primary, #1a1a1a);
  --color-background: var(--host-color-background, #ffffff);
  --color-accent: var(--host-color-accent, #3b82f6);
}
```

See: `mcp-ui-server/ui/shared/styles.css`

### Build Configuration

Use vite-plugin-singlefile to produce self-contained HTML files:

```javascript
// build-ui.mjs
import {build} from 'vite'
import {viteSingleFile} from 'vite-plugin-singlefile'
import react from '@vitejs/plugin-react'

const entries = ['product-grid', 'product-card', 'compare']

for (const entry of entries) {
  await build({
    configFile: false,
    plugins: [react(), viteSingleFile()],
    root: `ui/${entry}`,
    build: {outDir: tempDir, emptyOutDir: true},
  })
  // Rename index.html -> dist/{entry}.html
}
```

### CSP Configuration

Widgets run with strict Content Security Policy. Declare allowed domains:

```typescript
registerAppResource(server, 'Product Grid', 'ui://my-app/grid.html', {
  _meta: {
    ui: {
      csp: {
        connectDomains: ['https://api.sanity.io'], // Fetch requests
        resourceDomains: ['https://cdn.sanity.io'], // Images, fonts
      },
    },
  },
})
```

## Platform-Specific Extensions

ChatGPT supports optional extensions via `window.openai`:

```tsx
// Feature detection — works in ChatGPT, graceful no-op elsewhere
if (window.openai?.requestCheckout) {
  await window.openai.requestCheckout({url: checkoutUrl})
} else {
  openLink(checkoutUrl) // Standard fallback
}
```

Available ChatGPT extensions:

- `window.openai.requestCheckout` — native checkout flow
- `window.openai.uploadFile` — file upload
- `window.openai.requestModal` — host-level modal
- `window.openai.requestDisplayMode` — fullscreen/PiP

These are optional enhancements. Build with the standard MCP Apps bridge first, then layer platform-specific features with feature detection.

## Deploying and Connecting

### Local Development

```bash
pnpm install && pnpm dev
# Server at http://localhost:3001/mcp
```

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector@latest \
  --server-url http://localhost:3001/mcp \
  --transport http
```

### Connecting to ChatGPT

1. Enable Developer Mode in Settings > Apps > Advanced Settings
2. Settings > Connectors > Create App
3. Paste your ngrok or deployed URL + `/mcp`
4. Type `@{app-name}` in a chat

### Connecting to Claude Web

1. Settings > Connectors > Add Custom Connector
2. Paste your URL + `/mcp`
3. Click `+` in chat and select your connector

### Connecting to Claude Desktop (stdio)

```json
{
  "mcpServers": {
    "ecommerce": {
      "command": "npx",
      "args": ["tsx", "/path/to/src/main.ts", "--stdio"],
      "env": {
        "SANITY_CONTEXT_MCP_URL": "https://api.sanity.io/...",
        "SANITY_API_READ_TOKEN": "sk-...",
        "SANITY_PROJECT_ID": "...",
        "SANITY_DATASET": "production"
      }
    }
  }
}
```

### Production Deployment

Deploy as any Node.js HTTP server (Cloudflare Workers, Fly.io, Vercel, etc.). Must be HTTPS in production. The server is stateless — each request creates a fresh MCP session.

## Reference

### Ecommerce Example

See the complete reference implementation:

| File                                          | Purpose                                          |
| --------------------------------------------- | ------------------------------------------------ |
| `mcp-ui-server/src/server.ts`                 | Tool/resource registration, capability detection |
| `mcp-ui-server/src/upstream.ts`               | Agent Context MCP proxy client                   |
| `mcp-ui-server/src/main.ts`                   | HTTP + stdio transport, CORS                     |
| `mcp-ui-server/src/tools/show-products.ts`    | Product search with GROQ + semantic search       |
| `mcp-ui-server/src/tools/show-product.ts`     | Product detail with full variant data            |
| `mcp-ui-server/src/tools/compare-products.ts` | Side-by-side comparison                          |
| `mcp-ui-server/src/tools/answer-question.ts`  | Text-only Q&A                                    |
| `mcp-ui-server/ui/shared/bridge.ts`           | MCP Apps bridge helpers + React hooks            |
| `mcp-ui-server/ui/shared/sanity-image.ts`     | Sanity CDN image URL builder                     |
| `mcp-ui-server/ui/product-grid/App.tsx`       | Product grid widget                              |
| `mcp-ui-server/ui/product-card/App.tsx`       | Product detail widget                            |
| `mcp-ui-server/ui/compare/App.tsx`            | Comparison widget                                |

### Key External Links

- [MCP Apps spec (ext-apps)](https://github.com/modelcontextprotocol/ext-apps)
- [@modelcontextprotocol/ext-apps on npm](https://www.npmjs.com/package/@modelcontextprotocol/ext-apps)
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Skybridge framework](https://docs.skybridge.tech/) — higher-level framework with React hooks if you prefer not to use the raw bridge
