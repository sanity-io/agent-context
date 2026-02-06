/**
 * MCP Apps bridge helpers for widget ↔ host communication.
 *
 * Implements the ext-apps protocol over postMessage:
 *   - JSON-RPC requests (ui/initialize, tools/call, ui/message, etc.)
 *   - JSON-RPC notifications (ui/open-link, ui/update-model-context)
 *   - React hook for receiving tool results (ui/notifications/tool-result)
 *
 * This file is bundled into each widget HTML via Vite.
 */

import {useState, useEffect, useCallback, useRef} from 'react'

// ---------------------------------------------------------------------------
// JSON-RPC helpers
// ---------------------------------------------------------------------------

let rpcId = 0
const pending = new Map<number, {resolve: (v: unknown) => void; reject: (e: Error) => void}>()

/** Send a JSON-RPC request and wait for the response. */
export function rpcRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = ++rpcId
    pending.set(id, {resolve, reject})
    window.parent.postMessage({jsonrpc: '2.0', id, method, params: params ?? {}}, '*')
    // Timeout after 30 seconds
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error(`RPC timeout: ${method}`))
      }
    }, 30_000)
  })
}

/** Send a JSON-RPC notification (no response expected). */
export function rpcNotify(method: string, params?: Record<string, unknown>): void {
  window.parent.postMessage({jsonrpc: '2.0', method, params: params ?? {}}, '*')
}

// ---------------------------------------------------------------------------
// Message listener — handles responses and host notifications
// ---------------------------------------------------------------------------

type ToolResultData = {
  structuredContent?: unknown
  _meta?: Record<string, unknown>
  content?: Array<{type: string; text?: string}>
}

type ToolInputData = Record<string, unknown>

type HostContext = {
  theme?: 'light' | 'dark'
  locale?: string
  maxHeight?: number
  safeArea?: {insets: {top: number; right: number; bottom: number; left: number}}
}

const toolResultListeners = new Set<(data: ToolResultData) => void>()
const toolInputListeners = new Set<(data: ToolInputData) => void>()
const hostContextListeners = new Set<(data: HostContext) => void>()

let currentHostContext: HostContext = {}

function handleMessage(event: MessageEvent) {
  const msg = event.data
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') return

  // JSON-RPC response (to our requests)
  if ('id' in msg && pending.has(msg.id)) {
    const {resolve, reject} = pending.get(msg.id)!
    pending.delete(msg.id)
    if (msg.error) {
      reject(new Error(msg.error.message || 'RPC error'))
    } else {
      resolve(msg.result)
    }
    return
  }

  // Host notifications
  switch (msg.method) {
    case 'ui/notifications/tool-result':
      for (const listener of toolResultListeners) {
        listener(msg.params as ToolResultData)
      }
      break
    case 'ui/notifications/tool-input':
      for (const listener of toolInputListeners) {
        listener(msg.params as ToolInputData)
      }
      break
    case 'ui/notifications/host-context-changed':
      currentHostContext = {...currentHostContext, ...(msg.params as HostContext)}
      for (const listener of hostContextListeners) {
        listener(currentHostContext)
      }
      break
  }
}

window.addEventListener('message', handleMessage)

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

let initialized = false

/**
 * Perform the MCP Apps handshake:
 *   1. ui/initialize → host acknowledges
 *   2. ui/notifications/initialized → we're ready
 */
export async function initializeBridge(appName: string, version: string): Promise<void> {
  if (initialized) return
  initialized = true

  try {
    await rpcRequest('ui/initialize', {
      appName,
      appVersion: version,
      protocolVersion: '0.1',
    })
  } catch {
    // Some hosts may not respond to initialize — that's okay
  }

  rpcNotify('ui/notifications/initialized')
}

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------

/**
 * Subscribe to tool results delivered by the host.
 * Returns the latest tool result (structuredContent + _meta).
 */
export function useToolResult<T = unknown>(): {
  data: T | null
  meta: Record<string, unknown>
  content: Array<{type: string; text?: string}>
  isPending: boolean
} {
  const [data, setData] = useState<T | null>(null)
  const [meta, setMeta] = useState<Record<string, unknown>>({})
  const [content, setContent] = useState<Array<{type: string; text?: string}>>([])
  const [isPending, setIsPending] = useState(true)

  useEffect(() => {
    const handler = (result: ToolResultData) => {
      setData((result.structuredContent as T) ?? null)
      setMeta(result._meta ?? {})
      setContent(result.content ?? [])
      setIsPending(false)
    }
    toolResultListeners.add(handler)
    return () => {
      toolResultListeners.delete(handler)
    }
  }, [])

  return {data, meta, content, isPending}
}

/**
 * Subscribe to tool input delivered by the host.
 * Returns the input arguments that were passed to the tool.
 */
export function useToolInput<T = Record<string, unknown>>(): T | null {
  const [input, setInput] = useState<T | null>(null)

  useEffect(() => {
    const handler = (data: ToolInputData) => {
      setInput(data as T)
    }
    toolInputListeners.add(handler)
    return () => {
      toolInputListeners.delete(handler)
    }
  }, [])

  return input
}

/**
 * Subscribe to host context (theme, locale, maxHeight, safeArea).
 */
export function useHostContext(): HostContext {
  const [ctx, setCtx] = useState<HostContext>(currentHostContext)

  useEffect(() => {
    const handler = (data: HostContext) => setCtx(data)
    hostContextListeners.add(handler)
    return () => {
      hostContextListeners.delete(handler)
    }
  }, [])

  return ctx
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Call a server tool from the widget.
 * Returns a hook with callTool function and loading/result state.
 */
export function useCallServerTool<TResult = unknown>(toolName: string) {
  const [data, setData] = useState<TResult | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const callTool = useCallback(
    async (args: Record<string, unknown>) => {
      setIsPending(true)
      setError(null)
      try {
        const result = await rpcRequest('tools/call', {
          name: toolName,
          arguments: args,
        })
        if (mountedRef.current) {
          // The result comes back through tool-result notification too,
          // but we also capture it directly for the caller.
          const typed = result as {structuredContent?: TResult}
          setData(typed.structuredContent ?? null)
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        if (mountedRef.current) {
          setIsPending(false)
        }
      }
    },
    [toolName],
  )

  return {callTool, data, isPending, error}
}

/** Convenience: call a server tool (non-hook, fire-and-forget). */
export function callServerTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  return rpcRequest('tools/call', {name, arguments: args})
}

/** Send a chat message from the widget to trigger LLM response. */
export function sendMessage(text: string): void {
  rpcNotify('ui/message', {message: text})
}

/** Open an external link via the host. */
export function openLink(url: string): void {
  rpcNotify('ui/open-link', {url})
}

/** Update model context with widget state. */
export function updateModelContext(context: Record<string, unknown>): void {
  rpcNotify('ui/update-model-context', context)
}
