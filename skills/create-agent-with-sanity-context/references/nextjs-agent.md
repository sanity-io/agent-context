# Reference: Next.js + Vercel AI SDK Agent

This is a reference implementation using Next.js and Vercel AI SDK. Use it as a pattern guide—adapt the concepts to whatever framework and AI library the user is working with.

## Core Concepts (Apply to Any Stack)

These patterns transfer regardless of framework:

1. **MCP Connection**: HTTP transport to `https://context-mcp.sanity.io/mcp/:projectId/:dataset/:slug`
2. **Authentication**: Bearer token using Sanity API read token
3. **Tool Discovery**: Get available tools from MCP client, pass to LLM
4. **System Prompt**: Domain-specific instructions that shape agent behavior
5. **Streaming**: Stream responses for better UX (optional but recommended)

---

## Reference Implementation: Next.js + AI SDK

### 1. Install Dependencies

```bash
npm install @ai-sdk/anthropic @ai-sdk/mcp ai
# or
pnpm add @ai-sdk/anthropic @ai-sdk/mcp ai
```

### 2. Environment Variables

Add to your `.env.local`:

```bash
# Sanity Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production

# Sanity API token with read access
SANITY_API_READ_TOKEN=your-read-token

# Context MCP URL (from your Agent Context document)
SANITY_CONTEXT_MCP_URL=https://context-mcp.sanity.io/mcp/your-project-id/production/your-slug

# Anthropic API key
ANTHROPIC_API_KEY=your-anthropic-key
```

### 3. Create the Chat API Route

Create `app/api/chat/route.ts`:

```ts
import {anthropic} from '@ai-sdk/anthropic'
import {createMCPClient} from '@ai-sdk/mcp'
import {streamText, convertToModelMessages, stepCountIs, type UIMessage} from 'ai'

// Customize this for your domain
const getSystemPrompt = () => {
  return `You are a helpful assistant. Use your tools to find content and answer questions.`
}

export async function POST(req: Request) {
  const {messages}: {messages: UIMessage[]} = await req.json()

  // Validate environment variables
  if (!process.env.SANITY_CONTEXT_MCP_URL) {
    throw new Error('SANITY_CONTEXT_MCP_URL is not set')
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  // Create MCP client connection
  const mcpClient = await createMCPClient({
    transport: {
      type: 'http',
      url: process.env.SANITY_CONTEXT_MCP_URL,
      headers: {
        Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`,
      },
    },
  })

  const systemPrompt = getSystemPrompt()

  try {
    const result = streamText({
      model: anthropic('claude-opus-4-5'), // or 'claude-sonnet-4-20250514' for faster/cheaper responses
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: await mcpClient.tools(),
      stopWhen: stepCountIs(10), // Limit tool use iterations
      onFinish: async () => {
        await mcpClient.close()
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    await mcpClient.close()
    throw error
  }
}
```

### 4. Customizing the System Prompt

The system prompt shapes how your agent behaves. Customize it for your domain.

### Structure of an Effective System Prompt

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

### Example: E-commerce Assistant

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

### Example: Documentation Helper

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

### Example: Support Agent

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

### Example: Content Curator

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

### 5. Frontend Chat Component (Optional)

A basic chat interface using `@ai-sdk/react`:

```tsx
'use client'

import {useChat} from '@ai-sdk/react'
import {useState} from 'react'

export function Chat() {
  const {messages, sendMessage, status, error} = useChat()
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage({text: input})
    setInput('')
  }

  const isLoading = status === 'submitted' || status === 'streaming'

  return (
    <div>
      <div>
        {messages.map((message) => (
          <div key={message.id}>
            <strong>{message.role}:</strong>
            {message.parts?.map((part, i) => part.type === 'text' && <p key={i}>{part.text}</p>)}
          </div>
        ))}
        {error && <p style={{color: 'red'}}>Error: {error.message}</p>}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
```

This is a minimal example. For production, see [Advanced Patterns](#advanced-patterns) for:

- Client-side tool execution (page context, screenshots)
- Custom transport for user context
- Auto-continuation for tool calls
- Rich message rendering

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
  model: 'claude-opus-4-5',
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

These patterns take your agent from basic to production-ready.

### Client-Side Tools

Some tools need to run in the browser (capturing page context, taking screenshots). Define these as tools without execute functions on the server, then handle them on the client.

**Server (route.ts):**

```ts
import {z} from 'zod'

// Define client tools (no execute function - handled on client)
const clientTools = {
  get_page_context: {
    description:
      'Get page content as markdown: URL, title, headings, links, lists. Fast. No visuals.',
    inputSchema: z.object({
      reason: z.string().describe('Why you need page context'),
    }),
  },
  get_page_screenshot: {
    description:
      'Visual screenshot of the page. Use only when you need to see images, colors, or layout.',
    inputSchema: z.object({
      reason: z.string().describe('Why you need a screenshot'),
    }),
  },
}

// In streamText, combine MCP tools with client tools:
const result = streamText({
  model: anthropic('claude-opus-4-5'),
  system: systemPrompt,
  messages: await convertToModelMessages(messages),
  tools: {
    ...(await mcpClient.tools()),
    ...clientTools,
  },
  // ...
})
```

**Client (Chat.tsx):**

```tsx
import {useChat} from '@ai-sdk/react'

const {messages, sendMessage, addToolOutput} = useChat({
  onToolCall: async ({toolCall}) => {
    // Skip MCP tools (handled server-side)
    if (toolCall.dynamic) return

    switch (toolCall.toolName) {
      case 'get_page_context': {
        const markdown = capturePageContext() // Your implementation
        addToolOutput({
          tool: 'get_page_context',
          toolCallId: toolCall.toolCallId,
          output: markdown,
        })
        return
      }

      case 'get_page_screenshot': {
        const screenshot = await captureScreenshot() // Your implementation
        addToolOutput({
          tool: 'get_page_screenshot',
          toolCallId: toolCall.toolCallId,
          output: 'Screenshot captured.',
        })
        // Send screenshot as follow-up message with file attachment
        return
      }
    }
  },
})
```

### User Context Transport

Include context (current page, user preferences) with every request without the user typing it:

```tsx
import {DefaultChatTransport} from 'ai'

const {messages, sendMessage} = useChat({
  transport: new DefaultChatTransport({
    body: () => ({
      userContext: {
        documentTitle: document.title,
        documentLocation: window.location.href,
      },
    }),
  }),
})
```

Then access it on the server:

```ts
export async function POST(req: Request) {
  const {messages, userContext} = await req.json()

  const systemPrompt = `
    The user is currently on: ${userContext.documentLocation}
    Page title: ${userContext.documentTitle}
    // ... rest of prompt
  `
}
```

### Auto-Continuation for Tool Calls

When the LLM makes tool calls, automatically continue the conversation:

```tsx
import {lastAssistantMessageIsCompleteWithToolCalls} from 'ai'

const {messages, sendMessage} = useChat({
  sendAutomaticallyWhen: ({messages}) => {
    return lastAssistantMessageIsCompleteWithToolCalls({messages})
  },
})
```

### Custom Rendering (Product Directives)

For e-commerce or content-heavy apps, define custom markdown directives to render rich content:

**System Prompt:**

```
When mentioning products, use this directive syntax:
::product{slug="product-slug" title="Product Name" image="https://..."}
```

**Client Renderer:**

```tsx
import ReactMarkdown from 'react-markdown'
import remarkDirective from 'remark-directive'

// Custom plugin to handle ::product directives
function remarkProduct() {
  return (tree) => {
    visit(tree, 'leafDirective', (node) => {
      if (node.name === 'product') {
        // Transform to custom component data
        node.data = {
          hName: 'product-card',
          hProperties: node.attributes,
        }
      }
    })
  }
}

// In your component
;<ReactMarkdown
  remarkPlugins={[remarkDirective, remarkProduct]}
  components={{
    'product-card': ({slug, title, image}) => (
      <ProductCard slug={slug} title={title} image={image} />
    ),
  }}
>
  {messageText}
</ReactMarkdown>
```

### Sophisticated System Prompts

**Every domain needs a specialized system prompt.** The examples above (e-commerce, docs, support) are starting points—you'll need to work with the user to understand their specific content, terminology, and desired agent behavior.

System prompt development is iterative:

1. Start with a basic prompt based on the domain
2. Test with real user queries
3. Identify where the agent fails or behaves unexpectedly
4. Refine the prompt to handle those cases
5. Repeat until the agent meets expectations

Production prompts often need multiple context levels and strict formatting rules. Here's an example for an e-commerce store:

```ts
const getSystemPrompt = ({userContext}) => `
You are a shopping assistant at a premium store.

# Communication Rules
- If tools are needed, call them without any accompanying text.
- NEVER mention: tools, queries, schema, fields, data structure.
- FORBIDDEN phrases: "Let me", "I'll", "I need to", "checking", "looking".

# Context Levels (use minimum needed)

**Level 1: User Context (always available)**
- Current page: ${userContext.documentLocation}
- Page title: ${userContext.documentTitle}

**Level 2: get_page_context tool**
- Use for: "What's on this page?", "What products are shown?"
- Returns page text as markdown. Cheaper than screenshot.

**Level 3: get_page_screenshot tool**
- Use ONLY when you need to SEE images, colors, or layout.

# Displaying Products
- ALWAYS use product directives: ::product{slug="..." title="..." image="..."}
- NEVER write product names as plain text.
- If you don't have slug/title/image, describe generically ("several running shoes").

# GROQ Tips
- Dereference references: \`field->\` syntax
- For images: \`image.asset->url\` to get the URL
`
```

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
