/**
 * HTTP + stdio transport for the MCP UI server.
 *
 * Supports two modes:
 *   --stdio   StdioServerTransport for Claude Desktop config
 *   (default) HTTP server with StreamableHTTPServerTransport on /mcp
 */

import {createServer as createHttpServer} from 'node:http'
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import {createServer} from './server.js'

const PORT = parseInt(process.env.PORT || '3001', 10)

async function main() {
  const isStdio = process.argv.includes('--stdio')

  if (isStdio) {
    // --- stdio mode (Claude Desktop) ---
    const server = createServer()
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('MCP UI server running on stdio')
    return
  }

  // --- HTTP mode ---
  const httpServer = createHttpServer(async (req, res) => {
    // CORS headers for ChatGPT / Claude access
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'content-type, mcp-session-id, accept, authorization',
    )
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')

    // Preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    // Health check
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, {'Content-Type': 'application/json'})
      res.end(JSON.stringify({status: 'ok', name: 'ecommerce-mcp-ui'}))
      return
    }

    // MCP endpoint
    if (req.url === '/mcp') {
      // Create a fresh server + transport per request (stateless)
      const server = createServer()
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      })

      // Clean up when the response ends
      res.on('close', () => {
        transport.close().catch(() => {})
        server.close().catch(() => {})
      })

      await server.connect(transport)
      await transport.handleRequest(req, res)
      return
    }

    // 404
    res.writeHead(404, {'Content-Type': 'application/json'})
    res.end(JSON.stringify({error: 'Not found'}))
  })

  httpServer.listen(PORT, () => {
    console.log(`MCP UI server listening on http://localhost:${PORT}`)
    console.log(`MCP endpoint: http://localhost:${PORT}/mcp`)
    console.log(
      `Test with: npx @modelcontextprotocol/inspector@latest --server-url http://localhost:${PORT}/mcp --transport http`,
    )
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
