/**
 * Upstream proxy to Sanity Agent Context MCP.
 *
 * Creates a new MCP client per request (stateless) to match the upstream
 * server's stateless transport. Handles connect → callTool → close lifecycle.
 */

import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'

function getConfig() {
  const url = process.env.SANITY_CONTEXT_MCP_URL
  const token = process.env.SANITY_API_READ_TOKEN
  if (!url) throw new Error('SANITY_CONTEXT_MCP_URL is required')
  if (!token) throw new Error('SANITY_API_READ_TOKEN is required')
  return {url, token}
}

/**
 * Call a tool on the upstream Sanity Agent Context MCP server.
 *
 * Each call creates a fresh client connection and tears it down after
 * the response — no connection pooling, no session state.
 */
export async function callUpstream(
  toolName: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const {url, token} = getConfig()

  const client = new Client({name: 'ecommerce-mcp-ui', version: '1.0.0'}, {capabilities: {}})

  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: {
      headers: {Authorization: `Bearer ${token}`},
    },
  })

  try {
    await client.connect(transport)
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    })
    return result as CallToolResult
  } finally {
    await client.close().catch(() => {
      /* best-effort cleanup */
    })
  }
}

/**
 * List available tools from the upstream Context MCP.
 * Useful for capability detection at startup.
 */
export async function getUpstreamTools() {
  const {url, token} = getConfig()

  const client = new Client({name: 'ecommerce-mcp-ui', version: '1.0.0'}, {capabilities: {}})

  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: {
      headers: {Authorization: `Bearer ${token}`},
    },
  })

  try {
    await client.connect(transport)
    const result = await client.listTools()
    return result.tools
  } finally {
    await client.close().catch(() => {})
  }
}
