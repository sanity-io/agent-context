# Ecommerce Reference Implementation

Complete working example of a Next.js e-commerce site with AI shopping assistant powered by Sanity Context MCP.

> **Auto-synced** from `examples/ecommerce/`. Do not edit directly.

## When to Load Files

| Task                        | Load These Files                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| MCP connection setup        | `app/src/app/api/chat/route.ts` (lines 55-74)                                                                    |
| System prompt from Sanity   | `app/src/app/api/chat/route.ts` (lines 28-41, 68-83), `studio/schemaTypes/documents/agentConfig.ts`              |
| Client-side tool handling   | `app/src/components/chat/Chat.tsx`, `app/src/lib/client-tools.ts`                                                |
| Page context capture        | `app/src/lib/capture-context.ts`                                                                                 |
| Custom markdown rendering   | `app/src/components/chat/message/remarkDirectives.ts`, `app/src/components/chat/message/Product.tsx`             |
| Studio plugin setup         | `studio/sanity.config.ts`                                                                                        |
| Schema design patterns      | `studio/schemaTypes/documents/product.ts`, `studio/schemaTypes/index.ts`                                         |
| Sanity client/queries       | `app/src/sanity/lib/client.ts`, `app/src/sanity/queries/`                                                        |
| Conversation classification | `studio/sanity.blueprint.ts`, `studio/functions/agent-conversation/index.ts`, `app/src/lib/save-conversation.ts` |
| Environment variables       | `.env.example`                                                                                                   |

## File Map

### Agent Integration (Core)

```
app/src/app/api/chat/route.ts     # API route: MCP client, tools, streaming
app/src/lib/client-tools.ts       # Tool constants shared server/client
app/src/lib/capture-context.ts    # Page context & screenshot capture
app/src/lib/save-conversation.ts  # Save conversations for classification
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
├── sanity.blueprint.ts           # Function triggers (delta filters!)
├── functions/
│   └── agent-conversation/
│       └── index.ts              # Classification function
└── schemaTypes/
    ├── index.ts                  # Schema registration
    ├── documents/
    │   ├── product.ts            # Product schema
    │   ├── category.ts           # Category schema
    │   ├── brand.ts              # Brand schema
    │   ├── agentConversation.ts  # Conversation storage
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

### Conversation Classification (Blueprint + Function)

See [conversation-classification.md](../conversation-classification.md) — includes critical guidance on delta functions to prevent infinite loops.
