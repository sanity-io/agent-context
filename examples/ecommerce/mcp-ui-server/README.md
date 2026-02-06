# Ecommerce MCP UI Server

A wrapper MCP server that adds interactive UI widgets (product grids, product cards, comparison views) on top of Sanity Agent Context MCP. Works with ChatGPT, Claude, and any MCP Apps-compatible host.

## Architecture

```
ChatGPT / Claude / MCP Inspector
    |
    MCP (Streamable HTTP or stdio)
    |
+---+------------------------------------------+
|  Ecommerce MCP UI Server                     |
|  (this project)                               |
|                                               |
|  Tools exposed to the LLM:                   |
|    show_products     -> product grid widget   |
|    show_product      -> product card widget   |
|    compare_products  -> comparison widget     |
|    answer_question   -> text-only             |
|                                               |
|  App-only tools (widget can call):           |
|    load_more_products -> product grid widget  |
|                                               |
|  Internally calls upstream:                   |
|    groq_query, initial_context,              |
|    schema_explorer                            |
+--------------------+-------------------------+
                     |
                     MCP (Streamable HTTP)
                     |
+--------------------+-------------------------+
|  Sanity Agent Context MCP (unchanged)        |
|  api.sanity.io/.../agent-context/...         |
+----------------------------------------------+
```

## Prerequisites

- Node.js 18+
- A Sanity project with product data (use the sibling `studio/` for schema)
- An Agent Context document configured in your Studio
- A Sanity API read token

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Sanity credentials

# 3. Build and run
pnpm dev
```

The server starts at `http://localhost:3001` with MCP endpoint at `/mcp`.

## Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector@latest \
  --server-url http://localhost:3001/mcp \
  --transport http
```

Verify:

- `tools/list` returns 5 tools (4 model-visible + 1 app-only)
- `resources/list` returns 3 `ui://` resources
- Calling `show_products` with `{ "query": "jackets" }` returns structured product data

## Connecting to ChatGPT

1. Enable Developer Mode: Settings > Apps > Advanced Settings
2. Go to [Apps Settings](https://chatgpt.com/apps#settings/Connectors) > Create App
3. Enter a name and paste: `{your-ngrok-url}/mcp`
4. Set "No Authentication" and click Create
5. In a chat, type `@{app-name}` to invoke

For local testing, expose with ngrok: `ngrok http 3001`

## Connecting to Claude

### Claude Web

1. Go to [Connector Settings](https://claude.ai/settings/connectors) > Add Custom Connector
2. Enter a name and URL: `{your-ngrok-url}/mcp`
3. In Claude chat, click `+` and select your connector

### Claude Desktop (stdio)

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ecommerce": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-ui-server/src/main.ts", "--stdio"],
      "env": {
        "SANITY_CONTEXT_MCP_URL": "https://api.sanity.io/...",
        "SANITY_API_READ_TOKEN": "your-token",
        "SANITY_PROJECT_ID": "your-project-id",
        "SANITY_DATASET": "production"
      }
    }
  }
}
```

## How It Works

1. **User asks** "Show me winter jackets" in ChatGPT/Claude
2. **LLM picks** `show_products` based on tool description + input schema
3. **Server builds** a GROQ query with structural filters + semantic search
4. **Server calls** upstream Agent Context MCP: `groq_query`
5. **Server returns** `{ content, structuredContent, _meta }`
   - `content` -> LLM reads, narrates ("Here are 6 winter jackets")
   - `structuredContent` -> both LLM and widget read (product data)
   - `_meta` -> widget-only data (project ID, dataset for image URLs)
6. **Host renders** the linked `ui://` resource as a sandboxed iframe
7. **Widget renders** an interactive product grid from `structuredContent`
8. **User clicks** a product -> widget calls `show_product` -> detail card renders

## File Structure

```
src/
  main.ts                    # HTTP + stdio transport, CORS
  server.ts                  # Tool/resource registration, capability detection
  upstream.ts                # Agent Context MCP proxy client
  tools/
    show-products.ts         # Product search -> product grid widget
    show-product.ts          # Product detail -> product card widget
    compare-products.ts      # Comparison -> comparison widget
    answer-question.ts       # General Q&A -> text-only
ui/
  shared/
    bridge.ts                # MCP Apps bridge helpers + React hooks
    sanity-image.ts          # Sanity CDN image URL builder
    styles.css               # Host theme variables with fallbacks
  product-grid/              # Product grid widget (React)
  product-card/              # Product detail widget (React)
  compare/                   # Comparison widget (React)
dist/                        # Built single-file HTML bundles (gitignored)
```

## Customizing

### Adding a new tool

1. Create `src/tools/your-tool.ts` with a handler function
2. Register it in `src/server.ts` using `registerAppTool()` or `server.tool()`
3. If it needs a widget, create `ui/your-widget/` with `index.html` + `App.tsx`
4. Add the entry to `build-ui.mjs`
5. Register the resource in `src/server.ts` with `registerAppResource()`

### Modifying widget UI

Edit the React components in `ui/*/App.tsx`. Shared styles are in `ui/shared/styles.css`. Run `pnpm run build:ui` to rebuild, or use `pnpm dev` which rebuilds on start.

### Adding ChatGPT-specific features

The widgets use the standard MCP Apps bridge. To add ChatGPT-specific features (checkout, file upload, modals), use feature detection:

```tsx
if (window.openai?.requestCheckout) {
  // ChatGPT-specific checkout flow
} else {
  // Standard fallback
}
```
