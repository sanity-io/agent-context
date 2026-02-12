'use client'

import {useChat} from '@ai-sdk/react'
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from 'ai'
import {MessageCircle, X} from 'lucide-react'
import {useRouter, useSearchParams} from 'next/navigation'
import {Suspense, useCallback, useEffect, useRef, useState} from 'react'

import {
  AGENT_CHAT_HIDDEN_ATTRIBUTE,
  capturePageContext,
  captureScreenshot,
  captureUserContext,
} from '../../lib/capture-context'
import {CLIENT_TOOLS, type ProductFiltersInput, productFiltersSchema} from '../../lib/client-tools'
import {ChatInput} from './ChatInput'
import {Loader} from './Loader'
import {Message} from './message'
import {ToolCall} from './ToolCall'

// Show loader when waiting for text (not actively streaming text)
function isWaitingForText(messages: UIMessage[]): boolean {
  const last = messages[messages.length - 1]
  if (!last || last.role !== 'assistant') return true

  const parts = last.parts ?? []
  if (parts.length === 0) return true

  const lastPart = parts[parts.length - 1]
  return !(lastPart.type === 'text' && lastPart.text.trim().length > 0)
}

interface ChatProps {
  onClose: () => void
}

export function Chat(props: ChatProps) {
  return (
    <Suspense fallback={null}>
      <ChatInner {...props} />
    </Suspense>
  )
}

function ChatInner(props: ChatProps) {
  const {onClose} = props

  const router = useRouter()
  const searchParams = useSearchParams()
  const [input, setInput] = useState('')
  const debug = searchParams.get('debug') === 'true'
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Queue for screenshot to send after tool output
  const pendingScreenshotRef = useRef<string | null>(null)

  /** Apply product filters by navigating to /products with URL params */
  const applyProductFilters = useCallback(
    (filters: ProductFiltersInput): string => {
      const params = new URLSearchParams()

      filters.category?.forEach((v) => params.append('category', v))
      filters.color?.forEach((v) => params.append('color', v))
      filters.size?.forEach((v) => params.append('size', v))
      filters.brand?.forEach((v) => params.append('brand', v))
      if (filters.minPrice) params.set('minPrice', String(filters.minPrice))
      if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice))
      if (filters.sort) params.set('sort', filters.sort)

      const newUrl = `/products${params.toString() ? `?${params}` : ''}`
      router.push(newUrl, {scroll: false})
      return newUrl
    },
    [router],
  )

  const {messages, sendMessage, status, addToolOutput, error, regenerate} = useChat({
    // Include user context (page title/location) with every request
    transport: new DefaultChatTransport({
      body: () => ({userContext: captureUserContext()}),
    }),
    // Auto-continue for regular tools, but skip when screenshot is pending
    // as we send the screenshout manually after the tool output is received.
    sendAutomaticallyWhen: ({messages}) => {
      if (pendingScreenshotRef.current) return false
      return lastAssistantMessageIsCompleteWithToolCalls({messages})
    },
    onToolCall: async ({toolCall}) => {
      if (toolCall.dynamic) return

      switch (toolCall.toolName) {
        case CLIENT_TOOLS.PAGE_CONTEXT: {
          addToolOutput({
            tool: CLIENT_TOOLS.PAGE_CONTEXT,
            toolCallId: toolCall.toolCallId,
            output: capturePageContext(),
          })
          return
        }

        case CLIENT_TOOLS.SCREENSHOT: {
          try {
            const file = await captureScreenshot()

            pendingScreenshotRef.current = file

            addToolOutput({
              tool: CLIENT_TOOLS.SCREENSHOT,
              toolCallId: toolCall.toolCallId,
              output: `Screenshot captured.`,
            })
          } catch (err) {
            addToolOutput({
              tool: CLIENT_TOOLS.SCREENSHOT,
              toolCallId: toolCall.toolCallId,
              output: `Failed to capture screenshot: ${err instanceof Error ? err.message : String(err)}`,
            })
          }

          return
        }

        case CLIENT_TOOLS.SET_FILTERS: {
          const result = productFiltersSchema.safeParse(toolCall.input)
          if (!result.success) {
            addToolOutput({
              tool: CLIENT_TOOLS.SET_FILTERS,
              toolCallId: toolCall.toolCallId,
              output: `Invalid filter input: ${result.error.message}`,
            })
            return
          }

          const filters = result.data
          const newUrl = applyProductFilters(filters)

          // Build a human-readable summary of what was done
          const changes: string[] = []
          if (filters.category?.length) changes.push(`category: ${filters.category.join(', ')}`)
          if (filters.color?.length) changes.push(`color: ${filters.color.join(', ')}`)
          if (filters.size?.length) changes.push(`size: ${filters.size.join(', ')}`)
          if (filters.brand?.length) changes.push(`brand: ${filters.brand.join(', ')}`)
          if (filters.minPrice) changes.push(`min price: $${filters.minPrice}`)
          if (filters.maxPrice) changes.push(`max price: $${filters.maxPrice}`)
          if (filters.sort) changes.push(`sort: ${filters.sort}`)

          addToolOutput({
            tool: CLIENT_TOOLS.SET_FILTERS,
            toolCallId: toolCall.toolCallId,
            output: `Filters applied${changes.length > 0 ? `: ${changes.join(', ')}` : ''}. Navigated to ${newUrl}.`,
          })

          return
        }
      }
    },
  })

  // The `addToolOutput` does not support files, so we send the screenshot after
  // the tool output is received and the status is ready as a follow-up message.
  useEffect(() => {
    if (status !== 'ready' || !pendingScreenshotRef.current) return

    const screenshot = pendingScreenshotRef.current
    pendingScreenshotRef.current = null

    sendMessage({
      files: [
        {
          type: 'file' as const,
          filename: 'screenshot.jpg',
          mediaType: 'image/jpeg',
          url: screenshot,
        },
      ],
    })
  }, [status, sendMessage])

  // Scroll to the bottom of the messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'})
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage({text: input})
    setInput('')
  }

  const isLoading = status === 'submitted' || status === 'streaming'
  const showLoader = isLoading && isWaitingForText(messages)

  return (
    <div
      {...{[AGENT_CHAT_HIDDEN_ATTRIBUTE]: 'true'}}
      className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <MessageCircle className="h-4 w-4 text-white" />
          </div>

          <div>
            <h3 className="text-sm font-medium text-white">Shopping Assistant</h3>

            <p className="text-xs text-neutral-400">Ask me anything</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-neutral-400">
            <p>Ask me anything about our products.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                {/* Tool calls (debug only) - shown before text since they produce the response */}
                {debug &&
                  (message.parts ?? []).filter(isToolUIPart).map((part, i) => (
                    <div key={`${message.id}-tool-${i}`} className="flex justify-start">
                      <div className="max-w-[80%]">
                        <ToolCall
                          toolName={getToolName(part)}
                          state={part.state}
                          input={part.input}
                          output={'output' in part ? part.output : undefined}
                        />
                      </div>
                    </div>
                  ))}

                {/* Message text */}
                <Message message={message} />
              </div>
            ))}

            {showLoader && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg bg-neutral-100 px-4 py-2 text-sm text-neutral-900">
                  <Loader />
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="flex flex-col gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span>Something went wrong.</span>

                  <button
                    type="button"
                    onClick={() => regenerate()}
                    className="w-fit rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 p-4">
        <ChatInput input={input} setInput={setInput} onSubmit={handleSubmit} disabled={isLoading} />
      </div>
    </div>
  )
}
