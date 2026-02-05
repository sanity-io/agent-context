# Reference: Next.js + Vercel AI SDK Agent

This is a reference implementation using Next.js and Vercel AI SDK. Use it as a pattern guide—adapt the concepts to whatever framework and AI library the user is working with.

> **Reference Implementation**: See [ecommerce/\_index.md](ecommerce/_index.md) for file navigation, then explore [ecommerce/app/](ecommerce/app/).

## Core Concepts (Apply to Any Stack)

These patterns transfer regardless of framework:

1. **MCP Connection**: HTTP transport to `https://api.sanity.io/:apiVersion/agent-context/:projectId/:dataset/:slug`
2. **Authentication**: Bearer token using Sanity API read token
3. **Tool Discovery**: Get available tools from MCP client, pass to LLM
4. **System Prompt**: Domain-specific instructions that shape agent behavior
5. **Streaming**: Stream responses for better UX (optional but recommended)

---

## Reference Implementation: Next.js + AI SDK

### 1. Install Dependencies

```bash
npm install @ai-sdk/anthropic @ai-sdk/mcp @ai-sdk/react ai
# or
pnpm add @ai-sdk/anthropic @ai-sdk/mcp @ai-sdk/react ai
```

**IMPORTANT: Always check [ecommerce/app/package.json](ecommerce/app/package.json) for current working versions.**

Do NOT guess versions—check the reference `package.json` or use `npm info <package> version` to get the latest. AI SDK packages update frequently.

### 2. Environment Variables

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

### 3. Create the Chat API Route

See [ecommerce/app/src/app/api/chat/route.ts](ecommerce/app/src/app/api/chat/route.ts) for the complete implementation.

**Key sections:**

- **Lines 13-26**: Client tool definitions (no `execute` function - execution happens client-side)
- **Lines 28-41**: `buildSystemPrompt` function - template interpolation with runtime variables
- **Lines 55-74**: MCP client + agent config fetch from Sanity (parallel Promise.all)
- **Lines 80-83**: Build system prompt from fetched template
- **Lines 86-100**: `streamText` call combining MCP tools with client tools

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

### 4. Customizing the System Prompt

The system prompt shapes how your agent behaves. The reference implementation stores the system prompt in Sanity as an `agent.config` document, allowing content editors to customize it without code changes.

See [ecommerce/app/src/app/api/chat/route.ts](ecommerce/app/src/app/api/chat/route.ts):

- **Lines 28-41**: `buildSystemPrompt` function that interpolates runtime variables (`{{documentTitle}}`, `{{documentLocation}}`)
- **Lines 68-83**: Fetching the system prompt from Sanity and applying it

See [ecommerce/studio/schemaTypes/documents/agentConfig.ts](ecommerce/studio/schemaTypes/documents/agentConfig.ts) for the schema.

#### Structure of an Effective System Prompt

```ts
const getSystemPrompt = () => {
  return `
You are [role description].

## Your Capabilities
- [What the agent can do with the available tools]
- [Boundaries and limitations]

## How to Respond
- [Tone and style guidelines]
- [Formatting preferences]

## Tool Usage
- Use initial_context first to understand available content
- Use groq_query to find specific content
- Use schema_explorer when you need field details
`
}
```

#### Example: E-commerce Assistant

```ts
const getSystemPrompt = () => {
  return `
You are a helpful shopping assistant for an online store.

## Your Capabilities
- Search products by name, category, price, or features
- Compare products and make recommendations
- Answer questions about product details, availability, and specifications

## How to Respond
- Be friendly and helpful
- When showing products, include name, price, and key features
- If you can't find what the user wants, suggest alternatives

## Tool Usage
- Start with initial_context to understand product types
- Use groq_query with filters like _type == "product" && price < 100
- Combine structural filters with semantic search for best results
`
}
```

#### Example: Documentation Helper

```ts
const getSystemPrompt = () => {
  return `
You are a documentation assistant that helps users find information.

## Your Capabilities
- Search documentation articles and guides
- Explain concepts and provide examples
- Link related documentation together

## How to Respond
- Be concise but thorough
- Include code examples when relevant
- Point users to related articles they might find helpful

## Tool Usage
- Use semantic search to find conceptually related content
- Filter by category or topic when the user specifies
`
}
```

#### Example: Support Agent

```ts
const getSystemPrompt = () => {
  return `
You are a customer support agent with access to help articles and FAQs.

## Your Capabilities
- Find relevant help articles for user issues
- Provide step-by-step instructions
- Escalate complex issues appropriately

## How to Respond
- Be empathetic and patient
- Provide clear, actionable steps
- Confirm the user's issue is resolved before ending

## Tool Usage
- Search FAQs first for common questions
- Use help articles for detailed procedures
`
}
```

#### Example: Content Curator

```ts
const getSystemPrompt = () => {
  return `
You are a content curator that helps users discover relevant content.

## Your Capabilities
- Find articles, posts, and media based on interests
- Create personalized recommendations
- Surface trending or popular content

## How to Respond
- Present content in an engaging way
- Explain why each recommendation is relevant
- Group related content together

## Tool Usage
- Use semantic search for interest-based discovery
- Filter by date for recent content
- Use references to find related content
`
}
```

### 5. Frontend Chat Component

See [ecommerce/app/src/components/chat/Chat.tsx](ecommerce/app/src/components/chat/Chat.tsx) for a complete implementation.

**Key sections:**

- **Lines 62-109**: `useChat` hook setup with transport, auto-continuation, and tool handling
- **Lines 73-108**: Client-side tool execution via `onToolCall` callback
- **Lines 113-129**: Screenshot handling workaround (files sent as follow-up message)
- **Lines 146-238**: Chat UI rendering with message display and input

**Related files:**

- [ecommerce/app/src/lib/client-tools.ts](ecommerce/app/src/lib/client-tools.ts) - Tool name constants and `UserContext` type
- [ecommerce/app/src/lib/capture-context.ts](ecommerce/app/src/lib/capture-context.ts) - Page context and screenshot capture functions

### 6. Testing the Agent

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

### Tips for Iterating on System Prompts

1. **Start simple**: Begin with a basic prompt and add specificity as needed
2. **Test edge cases**: Try queries that might confuse the agent
3. **Review tool calls**: Check that the agent uses tools appropriately
4. **Iterate based on failures**: When the agent fails, update the prompt to handle that case
5. **Keep it focused**: A specialized agent often performs better than a generalist

---

## Adapting to Other Stacks

### The Universal Pattern

Regardless of framework, the integration follows this flow:

```
1. Create MCP client with HTTP transport
2. Authenticate with Sanity API token
3. Get tools from MCP client
4. Pass tools to your LLM along with system prompt
5. Handle tool calls and responses
6. Clean up MCP connection when done
```

### Different Frameworks

**Express/Node.js**: Same pattern, different route syntax

```ts
app.post('/api/chat', async (req, res) => {
  const mcpClient = await createMCPClient({...})
  // ... same MCP logic
})
```

**Remix**: Use action functions

```ts
export async function action({request}: ActionFunctionArgs) {
  const mcpClient = await createMCPClient({...})
  // ... same MCP logic
}
```

**Python/FastAPI**: Use MCP Python client

```python
from mcp import Client
client = Client(transport=HttpTransport(url=mcp_url, headers={...}))
tools = await client.get_tools()
```

### Different AI Libraries

**LangChain**: Wrap MCP tools as LangChain tools

```ts
const mcpTools = await mcpClient.tools()
const langchainTools = mcpTools.map(
  (tool) =>
    new DynamicTool({
      name: tool.name,
      description: tool.description,
      func: async (input) => mcpClient.callTool(tool.name, JSON.parse(input)),
    }),
)
```

**Direct Anthropic API**: Pass tool definitions directly

```ts
const tools = await mcpClient.tools()
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  system: systemPrompt,
  messages,
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  })),
})
```

### Questions to Ask Users

When adapting this pattern, understand:

1. **"What framework are you using?"** — Determines route/endpoint structure
2. **"What AI SDK or library?"** — Determines how tools are passed to the LLM
3. **"What's the agent's purpose?"** — Shapes the system prompt
4. **"What content types will it access?"** — Informs the GROQ filter in Studio
5. **"Streaming or request/response?"** — Affects response handling

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

**System Prompt** (define the syntax): Define custom directives in your system prompt stored in Sanity's `agent.config` document

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

Your `SANITY_API_READ_TOKEN` is missing or invalid. Generate a new token at sanity.io/manage with Viewer permissions.

### "No documents found" / Empty results

Check your Agent Context's content filter:

- Is the GROQ filter correct?
- Are the document types spelled correctly?
- Are there published documents matching the filter?

### Tools not appearing

1. Check that `mcpClient.tools()` returns tools (log it)
2. Ensure the MCP URL is correct (project ID, dataset, slug)
3. Verify the agent context document is published
