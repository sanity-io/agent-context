import {anthropic} from '@ai-sdk/anthropic'
import {createMCPClient} from '@ai-sdk/mcp'
import {convertToModelMessages, stepCountIs, streamText, type ToolSet, type UIMessage} from 'ai'
import {z} from 'zod'

import {CLIENT_TOOLS, productFiltersSchema, type UserContext} from '@/lib/client-tools'
import {saveConversation} from '@/lib/save-conversation'
import {client} from '@/sanity/lib/client'

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
 * Builds the system prompt from the Sanity document, interpolating runtime variables.
 * Available variables: {{documentTitle}}, {{documentLocation}}
 */
function buildSystemPrompt(props: {template: string; userContext: UserContext}) {
  const {template, userContext} = props

  const vars: Record<string, string> = {
    documentTitle: userContext.documentTitle,
    documentLocation: userContext.documentLocation,
  }

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '')
}

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

  const [mcpClient, agentConfig] = await Promise.all([
    // Create the MCP client
    createMCPClient({
      transport: {
        type: 'http',
        url: process.env.SANITY_CONTEXT_MCP_URL,
        headers: {
          Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`,
        },
      },
    }),

    // Get the agent config from Sanity
    client.fetch<{systemPrompt: string | null} | null>(
      `*[_type == "agent.config" && slug.current == $slug][0] { systemPrompt }`,
      {
        slug: process.env.AGENT_CONFIG_SLUG || 'default',
      },
    ),
  ])

  if (!agentConfig?.systemPrompt) {
    throw new Error('Agent config not found or missing system prompt. Create one in Sanity Studio.')
  }

  const systemPrompt = buildSystemPrompt({
    template: agentConfig.systemPrompt,
    userContext,
  })

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
