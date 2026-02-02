import {anthropic} from '@ai-sdk/anthropic'
import {createMCPClient} from '@ai-sdk/mcp'
import {convertToModelMessages, stepCountIs, streamText, type UIMessage} from 'ai'
import {z} from 'zod'

import {CLIENT_TOOLS, type UserContext} from '@/lib/client-tools'

/**
 * Client-side tools for capturing page context.
 * No execute functions - execution happens on the client via onToolCall.
 */
const clientTools = {
  [CLIENT_TOOLS.PAGE_CONTEXT]: {
    description: `Page context as markdown: URL, title, and text content (headings, links, lists). Fast. No visuals.`,
    inputSchema: z.object({
      reason: z.string().describe('Why you need page context'),
    }),
  },
  [CLIENT_TOOLS.SCREENSHOT]: {
    description: `Visual screenshot of the page. You CANNOT see anything visual without this - no images, colors, layout, or appearance.`,
    inputSchema: z.object({
      reason: z.string().describe('Why you need a screenshot'),
    }),
  },
}

const getSystemPrompt = (props: {userContext: UserContext}) => {
  const {userContext} = props

  return `
    You are a polished shopping assistant at a premium store.

    # Communication
    - If tools are needed, call them without any accompanying text.
    - Respond with: a brief intro + product directives (when showing products).
    - NEVER mention: tools, queries, schema, fields, variants, images, data structure, types.
    - FORBIDDEN phrases: "Let me", "I'll", "I need to", "checking", "looking", "finding".

    # Page Context (3 levels - use the minimum needed)

    **Level 1: <user-context> (already available - no tool needed)**
    - Use for: "Where am I?", "What page is this?", "Give me a link"

    <user-context>
      <document-title>${userContext.documentTitle}</document-title>
      <document-location>${userContext.documentLocation}</document-location>
    </user-context>

    **Level 2: get_page_context tool (text content)**
    - Use for: "What's on this page?", "What products are shown?", "Read this page"
    - Returns page text as markdown. Cheaper than screenshot.

    **Level 3: get_page_screenshot tool (visual)**
    -  Use for: "Does this look right?", "What color is X?", "Show me what you see"
    - Only when you need to SEE images, colors, or layout.

    # Displaying products
    - ALWAYS use document directives. NEVER write product names as plain text.
    - Query Sanity to get document _id and _type, then use the directive syntax below.
    - Page context may contain product names - do NOT repeat these as plain text. Query Sanity for the _id or summarize generically.

    ## Directive syntax
    ::document{id="<_id>" type="<_type>"}  <- Block format (for lists)
    :document{id="<_id>" type="<_type>"}   <- Inline format (within sentences)

    Example: ::document{id="product-abc123" type="product"}
`
}

export async function POST(req: Request) {
  const {messages, userContext}: {messages: UIMessage[]; userContext: UserContext} =
    await req.json()

  if (!process.env.SANITY_CONTEXT_MCP_URL) {
    throw new Error('SANITY_CONTEXT_MCP_URL is not set')
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  const mcpClient = await createMCPClient({
    transport: {
      type: 'http',
      url: process.env.SANITY_CONTEXT_MCP_URL,
      headers: {
        Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`,
      },
    },
  })

  const systemPrompt = getSystemPrompt({userContext})

  try {
    const mcpTools = await mcpClient.tools()

    const result = streamText({
      model: anthropic('claude-opus-4-5'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        ...mcpTools,
        ...clientTools,
      },
      stopWhen: stepCountIs(20),
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
