# Ecommerce Reference Implementation

Complete working example of a Next.js e-commerce site with AI shopping assistant powered by Sanity Context MCP.

> **Auto-synced** from `examples/ecommerce/`. Do not edit directly.

## When to Load Files

| Task                       | Load These Files                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| MCP connection setup       | `app/src/app/api/chat/route.ts` (lines 55-74)                                                        |
| System prompt from Sanity  | `app/src/app/api/chat/route.ts` (lines 28-41, 68-83), `studio/schemaTypes/documents/agentConfig.ts`  |
| Client-side tool handling  | `app/src/components/chat/Chat.tsx`, `app/src/lib/client-tools.ts`                                    |
| Page context capture       | `app/src/lib/capture-context.ts`                                                                     |
| Custom markdown rendering  | `app/src/components/chat/message/remarkDirectives.ts`, `app/src/components/chat/message/Product.tsx` |
| Studio plugin setup        | `studio/sanity.config.ts`                                                                            |
| Schema design patterns     | `studio/schemaTypes/documents/product.ts`, `studio/schemaTypes/index.ts`                             |
| Sanity client/queries      | `app/src/sanity/lib/client.ts`, `app/src/sanity/queries/`                                            |
| Environment variables      | `.env.example`                                                                                       |
| MCP Apps server setup      | `mcp-ui-server/src/server.ts`, `mcp-ui-server/src/upstream.ts`                                       |
| MCP Apps tool handlers     | `mcp-ui-server/src/tools/show-products.ts`, `mcp-ui-server/src/tools/show-product.ts`                |
| MCP Apps UI bridge         | `mcp-ui-server/ui/shared/bridge.ts`                                                                  |
| MCP Apps widget components | `mcp-ui-server/ui/product-grid/App.tsx`, `mcp-ui-server/ui/product-card/App.tsx`                     |
| MCP Apps environment setup | `mcp-ui-server/.env.example`                                                                         |

## File Map

### Agent Integration (Core)

```
app/src/app/api/chat/route.ts     # API route: MCP client, tools, streaming
app/src/lib/client-tools.ts       # Tool constants shared server/client
app/src/lib/capture-context.ts    # Page context & screenshot capture
```

### Chat UI

```
app/src/components/chat/
├── Chat.tsx                      # Main component: useChat, tool handling
├── ChatInput.tsx                 # Input field
├── ChatButton.tsx                # Floating button to open chat
├── Loader.tsx                    # Loading indicator
├── ToolCall.tsx                  # Debug tool call display
└── message/
    ├── Message.tsx               # Message rendering
    ├── TextPart.tsx              # Text with markdown
    ├── Product.tsx               # Product card directive
    └── remarkDirectives.ts       # Markdown directive parser
```

### Sanity Studio

```
studio/
├── sanity.config.ts              # Plugin setup, structure customization
└── schemaTypes/
    ├── index.ts                  # Schema registration
    ├── documents/
    │   ├── product.ts            # Product schema
    │   ├── category.ts           # Category schema
    │   ├── brand.ts              # Brand schema
    │   └── ...
    └── objects/
        ├── productVariant.ts     # Variant (size/color combos)
        ├── price.ts              # Price object
        └── seo.ts                # SEO metadata
```

### Sanity Queries & Client

```
app/src/sanity/
├── lib/
│   ├── client.ts                 # Sanity client setup
│   └── image.ts                  # Image URL builder
└── queries/
    ├── products.ts               # Product queries
    ├── categories.ts             # Category queries
    └── fragments.ts              # Reusable GROQ fragments
```

### Product Pages (Context for Agent)

```
app/src/app/
├── page.tsx                      # Homepage
└── products/
    ├── page.tsx                  # Product listing
    └── [slug]/page.tsx           # Product detail
```

### MCP UI Server (MCP Apps)

```
mcp-ui-server/
├── src/
│   ├── main.ts                    # HTTP + stdio transport, CORS
│   ├── server.ts                  # Tool/resource registration, capability detection
│   ├── upstream.ts                # Agent Context MCP proxy client
│   └── tools/
│       ├── show-products.ts       # Product search -> product grid widget
│       ├── show-product.ts        # Product detail -> product card widget
│       ├── compare-products.ts    # Comparison -> comparison widget
│       └── answer-question.ts     # General Q&A -> text-only
├── ui/
│   ├── shared/
│   │   ├── bridge.ts              # MCP Apps bridge helpers + React hooks
│   │   ├── sanity-image.ts        # Sanity CDN image URL builder
│   │   └── styles.css             # Host theme variables
│   ├── product-grid/              # Product grid widget (React)
│   ├── product-card/              # Product detail widget (React)
│   └── compare/                   # Comparison widget (React)
└── dist/                          # Built single-file HTML bundles
```

## Key Patterns

### MCP Connection

See `app/src/app/api/chat/route.ts` lines 55-74

### Client Tools (No Server Execute)

See `app/src/app/api/chat/route.ts` lines 13-26

### System Prompt from Sanity

See `app/src/app/api/chat/route.ts` lines 28-41 (`buildSystemPrompt`), 68-83 (fetch & apply)

### Tool Handling on Client

See `app/src/components/chat/Chat.tsx` lines 73-108

### Auto-continuation

See `app/src/components/chat/Chat.tsx` lines 69-72

### Custom Directives

See `app/src/components/chat/message/remarkDirectives.ts`
