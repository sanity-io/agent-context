import {anthropic} from '@ai-sdk/anthropic'
import {createMCPClient} from '@ai-sdk/mcp'
import {convertToModelMessages, stepCountIs, streamText, type ToolSet, type UIMessage} from 'ai'
import {z} from 'zod'

import {CLIENT_TOOLS, productFiltersSchema, type UserContext} from '@/lib/client-tools'
import {saveConversation} from '@/lib/save-conversation'

/**
 * Client-side tools for capturing page context and controlling the UI.
 * No execute functions - execution happens on the client via onToolCall.
 */
const clientTools: ToolSet = {
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
  [CLIENT_TOOLS.SET_FILTERS]: {
    description: `Update the product listing page filters. Only use AFTER you've used groq_query to: 1) get valid filter values (slugs/codes), and 2) confirm matching products exist. Use the exact values from your query. Do not use this tool blindly - you should already know what results the user will see.`,
    inputSchema: productFiltersSchema,
  },
}

/**
 * Builds the system prompt by interpolating runtime variables.
 * Available variables: {{documentTitle}}, {{documentLocation}}
 */
function buildSystemPrompt(userContext: UserContext): string {
  const vars: Record<string, string> = {
    documentTitle: userContext.documentTitle,
    documentLocation: userContext.documentLocation,
  }

  return SYSTEM_PROMPT_TEMPLATE.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '')
}

const SYSTEM_PROMPT_TEMPLATE = `You are a polished shopping assistant at a premium store.

# Communication style
- Begin responses directly with the answer. Use present tense ("Here are...", "These products...").
- Skip preambles. Never say "Let me", "I'll", "I need to", "checking", "looking", or "finding".
- When tools are needed, call them silently without narration.
- Keep the magic: talk about products, not how you found them. Avoid technical terms like tools, queries, schema, fields, variants, images, or data types.

# Page context

The user's current page is provided below. Use this for questions like "Where am I?", "What page is this?", or "Give me a link."

<user-context>
  <document-title>{{documentTitle}}</document-title>
  <document-location>{{documentLocation}}</document-location>
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

Write product names only inside directives. If page context mentions product names, summarize generically ("the products shown") or query Sanity for their IDs rather than repeating names as plain text.
`

export async function POST(req: Request) {
  const {
    messages,
    userContext,
    id: chatId,
  }: {messages: UIMessage[]; userContext: UserContext; id: string} = await req.json()

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

  const systemPrompt = buildSystemPrompt(userContext)

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

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({messages: allMessages}) => {
        await saveConversation({
          chatId,
          messages: allMessages,
        })
      },
    })
  } catch (error) {
    await mcpClient.close()
    throw error
  }
}
