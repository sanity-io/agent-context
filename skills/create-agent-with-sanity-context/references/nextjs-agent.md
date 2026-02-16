# Reference: Next.js + Vercel AI SDK Agent

This is a reference implementation using Next.js and Vercel AI SDK. Use it as a pattern guide—adapt the concepts to whatever framework and AI library the user is working with.

> **Reference Implementation**: See [ecommerce/\_index.md](ecommerce/_index.md) for file navigation, then explore [ecommerce/app/](ecommerce/app/).

## Contents

- [Install Dependencies](#1-install-dependencies)
- [Environment Variables](#2-environment-variables)
- [Chat API Route](#3-create-the-chat-api-route)
- [Customizing the System Prompt](#4-customizing-the-system-prompt)
- [Frontend Chat Component](#5-frontend-chat-component)
- [Testing the Agent](#6-testing-the-agent)
- [Advanced Patterns](#advanced-patterns)
- [Troubleshooting](#troubleshooting)

---

## 1. Install Dependencies

```bash
npm install @ai-sdk/anthropic @ai-sdk/mcp @ai-sdk/react ai
# or
pnpm add @ai-sdk/anthropic @ai-sdk/mcp @ai-sdk/react ai
```

**IMPORTANT: Always check [ecommerce/app/package.json](ecommerce/app/package.json) for current working versions.**

Do NOT guess versions—check the reference `package.json` or use `npm info <package> version` to get the latest. AI SDK packages update frequently.

## 2. Environment Variables

See [ecommerce/.env.example](ecommerce/.env.example) for the template.

Required variables:

```bash
# Sanity Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production

# Sanity API token with read access
SANITY_API_READ_TOKEN=your-read-token

# Context MCP URL (from your Agent Context document)
SANITY_CONTEXT_MCP_URL=https://api.sanity.io/:apiVersion/agent-context/your-project-id/production/your-slug

# Anthropic API key
ANTHROPIC_API_KEY=your-anthropic-key
```

## 3. Create the Chat API Route

See [ecommerce/app/src/app/api/chat/route.ts](ecommerce/app/src/app/api/chat/route.ts) for the complete implementation.

**Key sections:**

- **Client tool definitions**: Tools without `execute` function - execution happens client-side
- **`SYSTEM_PROMPT_TEMPLATE`**: Inline system prompt with template variables
- **`buildSystemPrompt`**: Function that interpolates runtime variables
- **MCP client creation**: HTTP transport connection to Sanity Context MCP
- **`streamText` call**: Combining MCP tools with client tools

**MCP Connection Pattern** (lines 57-65):

```ts
const mcpClient = await createMCPClient({
  transport: {
    type: 'http',
    url: process.env.SANITY_CONTEXT_MCP_URL,
    headers: {
      Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`,
    },
  },
})
```

**Tool Combination** (lines 86-100):

```ts
const mcpTools = await mcpClient.tools()
const result = streamText({
  model: anthropic('claude-opus-4-5'),
  system: systemPrompt,
  messages: await convertToModelMessages(messages),
  tools: {
    ...mcpTools, // Context MCP tools (groq_query, initial_context, etc.)
    ...clientTools, // Client-side tools (page context, screenshot)
  },
})
```

## 4. Customizing the System Prompt

The system prompt shapes how your agent behaves. The reference implementation uses an inline system prompt defined as a constant in the API route.

See [ecommerce/app/src/app/api/chat/route.ts](ecommerce/app/src/app/api/chat/route.ts):

- **`SYSTEM_PROMPT_TEMPLATE`**: The system prompt constant with template variables
- **`buildSystemPrompt`**: Function that interpolates runtime variables (`{{documentTitle}}`, `{{documentLocation}}`)

**For system prompt structure and examples**, see [system-prompts.md](system-prompts.md).

## 5. Frontend Chat Component

See [ecommerce/app/src/components/chat/Chat.tsx](ecommerce/app/src/components/chat/Chat.tsx) for a complete implementation.

**Key sections:**

- **Lines 62-109**: `useChat` hook setup with transport, auto-continuation, and tool handling
- **Lines 73-108**: Client-side tool execution via `onToolCall` callback
- **Lines 113-129**: Screenshot handling workaround (files sent as follow-up message)
- **Lines 146-238**: Chat UI rendering with message display and input

**Related files:**

- [ecommerce/app/src/lib/client-tools.ts](ecommerce/app/src/lib/client-tools.ts) - Tool name constants and `UserContext` type
- [ecommerce/app/src/lib/capture-context.ts](ecommerce/app/src/lib/capture-context.ts) - Page context and screenshot capture functions

## 6. Testing the Agent

1. Start your Next.js dev server: `npm run dev`
2. Open your chat interface or test via curl:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What content do you have access to?"}]}'
```

The agent should:

1. Call `initial_context` to understand available content types
2. Respond with a summary of what it can help with

---

## Advanced Patterns

These patterns take your agent from basic to production-ready. See the reference implementation for working examples of each.

### Client-Side Tools

Some tools need to run in the browser (capturing page context, taking screenshots). Define these as tools without execute functions on the server, then handle them on the client.

**Server definition**: See [ecommerce/app/src/app/api/chat/route.ts](ecommerce/app/src/app/api/chat/route.ts) lines 13-26

**Client handling**: See [ecommerce/app/src/components/chat/Chat.tsx](ecommerce/app/src/components/chat/Chat.tsx) lines 73-108

**Context capture utilities**: See [ecommerce/app/src/lib/capture-context.ts](ecommerce/app/src/lib/capture-context.ts)

- `captureUserContext()` (lines 20-30): Lightweight context sent with every message
- `capturePageContext()` (lines 35-68): Page content as markdown using Turndown
- `captureScreenshot()` (lines 73-93): Visual screenshot using html2canvas

### User Context Transport

Include context (current page, user preferences) with every request without the user typing it.

See [ecommerce/app/src/components/chat/Chat.tsx](ecommerce/app/src/components/chat/Chat.tsx) lines 64-66:

```tsx
transport: new DefaultChatTransport({
  body: () => ({userContext: captureUserContext()}),
}),
```

Then access it on the server at [ecommerce/app/src/app/api/chat/route.ts](ecommerce/app/src/app/api/chat/route.ts) lines 44-45:

```ts
const {messages, userContext}: {messages: UIMessage[]; userContext: UserContext} = await req.json()
```

### Auto-Continuation for Tool Calls

When the LLM makes tool calls, automatically continue the conversation.

See [ecommerce/app/src/components/chat/Chat.tsx](ecommerce/app/src/components/chat/Chat.tsx) lines 69-72:

```tsx
sendAutomaticallyWhen: ({messages}) => {
  if (pendingScreenshotRef.current) return false
  return lastAssistantMessageIsCompleteWithToolCalls({messages})
},
```

### Custom Rendering (Product Directives)

For e-commerce or content-heavy apps, define custom markdown directives to render rich content.

**System Prompt** (define the syntax): Define custom directives in your system prompt (see `SYSTEM_PROMPT_TEMPLATE` in the API route)

**Directive parsing**: See [ecommerce/app/src/components/chat/message/remarkDirectives.ts](ecommerce/app/src/components/chat/message/remarkDirectives.ts)

- Lines 64-131: `remarkDirectives()` plugin that transforms directive syntax to React components
- Handles both inline (`:product{...}`) and block (`::product{...}`) formats
- Validates directive names and filters incomplete directives during streaming

**Product component**: See [ecommerce/app/src/components/chat/message/Product.tsx](ecommerce/app/src/components/chat/message/Product.tsx)

- Lines 16-21: Inline rendering as a link
- Lines 24-35: Block rendering with image thumbnail

---

## Troubleshooting

### "SANITY_CONTEXT_MCP_URL is not set"

Ensure you've:

1. Created an Agent Context document in Studio
2. Given it a slug
3. Copied the MCP URL from the document
4. Added it to your `.env.local`

### "401 Unauthorized" from MCP

Your `SANITY_API_READ_TOKEN` is missing or invalid. Generate a new token at [sanity.io/manage](https://sanity.io/manage) with Viewer permissions.

### "No documents found" / Empty results

Check your Agent Context's content filter:

- Is the GROQ filter correct?
- Are the document types spelled correctly?
- Are there published documents matching the filter?

### Tools not appearing

1. Check that `mcpClient.tools()` returns tools (log it)
2. Ensure the MCP URL is correct (project ID, dataset, slug)
3. Verify the agent context document is published
