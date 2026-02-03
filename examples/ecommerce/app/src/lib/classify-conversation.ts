import {createAnthropic} from '@ai-sdk/anthropic'
import {createClient} from '@sanity/client'
import {generateText, Output, type UIMessage} from 'ai'
import {z} from 'zod'

const classificationSchema = z.object({
  summary: z
    .string()
    .describe(
      'A brief factual summary of what the user asked for. Just state the request, no judgment or commentary.',
    ),
  successRate: z
    .number()
    .min(0)
    .max(100)
    .describe(
      '0-100 score: Did the conversation achieve its goal? 100 = user got exactly what they needed, 50 = partially helped, 0 = complete failure.',
    ),
  agentConfusion: z
    .number()
    .min(0)
    .max(100)
    .describe(
      '0-100 score: How much did the agent struggle to respond helpfully? 0 = responded confidently (even if redirecting off-topic questions), 100 = completely lost or gave wrong info. Note: gracefully handling off-topic questions is NOT confusion.',
    ),
  userConfusion: z
    .number()
    .min(0)
    .max(100)
    .describe(
      '0-100 score: How unclear was the user request? 0 = crystal clear, 100 = completely incomprehensible',
    ),
})

type ConversationClassification = z.infer<typeof classificationSchema>

/**
 * Classifies conversation messages using AI.
 */
async function classifyMessages(
  messages: ConversationMessage[],
): Promise<ConversationClassification | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set, skipping classification')
    return null
  }

  try {
    const anthropic = createAnthropic({apiKey: process.env.ANTHROPIC_API_KEY})

    const {output} = await generateText({
      model: anthropic('claude-3-5-haiku-latest'),
      output: Output.object({
        schema: classificationSchema,
      }),
      prompt: `
Analyze this shopping assistant conversation and classify it.

Score these on a 0-100 scale:
- successRate: Did the conversation achieve its goal? (100 = user got exactly what they needed, 50 = partially helped, 0 = complete failure)
- agentConfusion: How much did the agent struggle? (0 = handled confidently, 100 = completely lost). Gracefully redirecting off-topic questions = 0.
- userConfusion: How unclear or off-topic was the user? (0 = clear relevant request, 100 = incomprehensible or completely off-topic)

Also determine:
- summary: What did the user ask for? Just state it factually.
- contentGap: ONLY fill this if the agent struggled because the STORE IS MISSING content (products, categories, info). Leave empty otherwise.

<conversation>
${JSON.stringify(messages, null, 2)}
</conversation>`,
    })

    return output ?? null
  } catch (error) {
    console.error('Classification failed:', error)
    return null
  }
}

interface ConversationMessage {
  role: string
  content: string
}

interface SaveConversationInput {
  chatId: string
  messages: UIMessage[]
}

/**
 * Classifies and saves a conversation to Sanity.
 */
export async function saveConversation(input: SaveConversationInput): Promise<void> {
  const {chatId, messages} = input

  // Format messages for storage, filtering out empty ones
  // Concatenate ALL text parts (assistant messages can have multiple: intermediate + final)
  const conversationMessages: ConversationMessage[] = messages
    .map((message) => ({
      role: message.role,
      content:
        message.parts
          ?.filter((part): part is {type: 'text'; text: string} => part.type === 'text')
          .map((part) => part.text)
          .join('\n\n') ?? '',
    }))
    .filter((message) => message.content.trim() !== '')

  // Classify the conversation
  const classification = await classifyMessages(conversationMessages)

  // Save to Sanity
  const client = createClient({
    projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
    dataset: process.env.SANITY_STUDIO_DATASET!,
    apiVersion: '2026-01-01',
    apiHost: process.env.SANITY_STUDIO_API_HOST || 'https://api.sanity.io',
    useCdn: false,
    token: process.env.SANITY_API_WRITE_TOKEN,
  })

  await client.createOrReplace(
    {
      _type: 'agent.conversation',
      _id: chatId,
      messages: conversationMessages,
      summary: classification?.summary,
      classification: classification
        ? {
            successRate: classification.successRate,
            agentConfusion: classification.agentConfusion,
            userConfusion: classification.userConfusion,
          }
        : undefined,
    },
    {autoGenerateArrayKeys: true},
  )
}
