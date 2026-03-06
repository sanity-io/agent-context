import {anthropic} from '@ai-sdk/anthropic'
import {createMCPClient, type MCPClient} from '@ai-sdk/mcp'
import {convertToModelMessages, stepCountIs, streamText, type UIMessage} from 'ai'

import {clientTools, type UserContext} from '@/lib/client-tools'
import {saveConversation} from '@/lib/save-conversation'
import {client} from '@/sanity/lib/client'

const DEFAULT_MODEL = 'claude-sonnet-4-5'
const MAX_STEPS = 20

interface BuildSystemPromptParams {
  basePrompt: string
  userContext: UserContext
}

/**
 * Builds the full system prompt by combining:
 * 1. Base prompt from Sanity (persona, communication style)
 * 2. Implementation-specific sections (page context, directive syntax)
 */
function buildSystemPrompt({basePrompt, userContext}: BuildSystemPromptParams): string {
  return `
${basePrompt}

# Page context

The user's current page is provided below. Use this for questions like "Where am I?", "What page is this?", or "Give me a link."

<user-context>
  <document-title>${userContext.documentTitle}</document-title>
  <document-location>${userContext.documentLocation}</document-location>
</user-context>

For deeper page understanding, two tools are available:

- **get_page_context**: Returns the page as markdown (headings, links, lists). Use for "What's on this page?", "What products are shown?", "Summarize this page."
- **get_page_screenshot**: Returns a visual screenshot. Use only when you need to see images, colors, or layout—for questions like "What color is this?", "Does this look right?", "Show me what you see."

Choose the minimum level needed: user-context first, then get_page_context, then get_page_screenshot.

# Displaying products

Render products using document directives so the UI can display rich cards. Query Sanity to get the document _id and _type, then use this syntax:

Block format (for product lists):
::document{id="<_id>" type="<_type>"}

Inline format (within a sentence):
:document{id="<_id>" type="<_type>"}

Example response showing three jackets:
::document{id="product-abc123" type="product"}
::document{id="product-def456" type="product"}
::document{id="product-ghi789" type="product"}

Example inline: Check out the :document{id="product-abc123" type="product"} for a timeless look.

Write product names only inside directives. If page context mentions product names, summarize generically ("the products shown") or query Sanity for their IDs rather than repeating names as plain text.
`
}

interface ChatRequest {
  messages: UIMessage[]
  userContext: UserContext
  id: string
}

export async function POST(req: Request) {
  const {messages, userContext, id: chatId}: ChatRequest = await req.json()

  // Validate required environment variables
  if (!process.env.SANITY_CONTEXT_MCP_URL) {
    return Response.json({error: 'SANITY_CONTEXT_MCP_URL is not set'}, {status: 500})
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({error: 'ANTHROPIC_API_KEY is not set'}, {status: 500})
  }

  let mcpClient: MCPClient | null = null

  try {
    // Initialize MCP client and fetch system prompt from Sanity document
    const [mcpClientResult, agentConfig] = await Promise.all([
      createMCPClient({
        transport: {
          type: 'http',
          url: process.env.SANITY_CONTEXT_MCP_URL,
          headers: {
            Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`,
          },
        },
      }),
      client.fetch<{systemPrompt: string | null} | null>(
        `*[_type == "agent.config" && slug.current == $slug][0] { systemPrompt }`,
        {slug: process.env.AGENT_CONFIG_SLUG || 'default'},
      ),
    ])

    mcpClient = mcpClientResult

    if (!agentConfig?.systemPrompt) {
      await mcpClient?.close()
      return Response.json(
        {error: 'Agent config not found or missing system prompt. Create one in Sanity Studio.'},
        {status: 500},
      )
    }

    const systemPrompt = buildSystemPrompt({
      basePrompt: agentConfig.systemPrompt,
      userContext,
    })

    const mcpTools = await mcpClient.tools()
    const modelId = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL

    const result = streamText({
      model: anthropic(modelId),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        ...mcpTools,
        ...clientTools,
      },
      stopWhen: stepCountIs(MAX_STEPS),
      onFinish: async () => {
        await mcpClient?.close()
      },
    })

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({messages: allMessages}) => {
        try {
          await saveConversation({chatId, messages: allMessages})
        } catch (err) {
          console.error('Failed to save conversation:', err)
        }
      },
    })
  } catch (error) {
    await mcpClient?.close()

    return Response.json(
      {error: error instanceof Error ? error.message : 'An unexpected error occurred'},
      {status: 500},
    )
  }
}
