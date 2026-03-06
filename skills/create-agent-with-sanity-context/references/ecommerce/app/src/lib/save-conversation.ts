import {type UIMessage} from 'ai'

import {writeClient} from '@/sanity/lib/write-client'

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

  await writeClient.createOrReplace(
    {
      _type: 'agent.conversation',
      _id: chatId,
      messages: conversationMessages,
    },
    {autoGenerateArrayKeys: true},
  )
}
