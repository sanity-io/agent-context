# Adapting to Different Stacks

The MCP connection pattern is framework and LLM-agnostic. This guide shows how to adapt the core pattern to different frameworks and AI libraries.

## Contents

- [The Universal Pattern](#the-universal-pattern)
- [Different Frameworks](#different-frameworks)
- [Different AI Libraries](#different-ai-libraries)
- [Questions to Ask Users](#questions-to-ask-users)

---

## The Universal Pattern

Regardless of framework, the integration follows this flow:

```
1. Create MCP client with HTTP transport
2. Authenticate with Sanity API token
3. Get tools from MCP client
4. Pass tools to your LLM along with system prompt
5. Handle tool calls and responses
6. Clean up MCP connection when done
```

---

## Different Frameworks

**Express/Node.js**

```ts
app.post('/api/chat', async (req, res) => {
  const mcpClient = await createMCPClient({
    transport: {
      type: 'http',
      url: process.env.SANITY_CONTEXT_MCP_URL,
      headers: {Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`},
    },
  })
  const tools = await mcpClient.tools()
  // Pass tools to your LLM, handle response...
})
```

**Remix**

```ts
export async function action({request}: ActionFunctionArgs) {
  const mcpClient = await createMCPClient({
    transport: {
      type: 'http',
      url: process.env.SANITY_CONTEXT_MCP_URL,
      headers: {Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`},
    },
  })
  const tools = await mcpClient.tools()
  // Pass tools to your LLM, handle response...
}
```

**Python/FastAPI**

```python
from mcp import Client, HttpTransport

client = Client(
    transport=HttpTransport(
        url=os.environ["SANITY_CONTEXT_MCP_URL"],
        headers={"Authorization": f"Bearer {os.environ['SANITY_API_READ_TOKEN']}"}
    )
)
tools = await client.get_tools()
# Pass tools to your LLM, handle response...
```

---

## Different AI Libraries

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

---

## Questions to Ask Users

When adapting this pattern, understand:

1. **"What framework are you using?"** — Determines route/endpoint structure
2. **"What AI SDK or library?"** — Determines how tools are passed to the LLM
3. **"What's the agent's purpose?"** — Shapes the system prompt
4. **"What content types will it access?"** — Informs the GROQ filter in Studio
5. **"Streaming or request/response?"** — Affects response handling
