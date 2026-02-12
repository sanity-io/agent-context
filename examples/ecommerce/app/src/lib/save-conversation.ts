import {createClient} from '@sanity/client'
import {type UIMessage} from 'ai'

interface ConversationMessage {
  role: string
  content: string
}

interface SaveConversationInput {
  chatId: string
  messages: UIMessage[]
}

/**
 * Saves a conversation to Sanity for classification by a Sanity Function.
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
    },
    {autoGenerateArrayKeys: true},
  )
}
