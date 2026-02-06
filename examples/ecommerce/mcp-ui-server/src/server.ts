/**
 * MCP server creation, tool/resource registration, and capability detection.
 *
 * Registers domain-specific tools that wrap the upstream Sanity Agent Context MCP.
 * When the host supports MCP Apps (ui:// resources), tools are linked to HTML widgets.
 * Otherwise, text-only fallback versions are registered.
 */

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  registerAppTool,
  registerAppResource,
  getUiCapability,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server'
import {z} from 'zod'
import {readFileSync, existsSync} from 'node:fs'
import {resolve, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

import {handleShowProducts, handleLoadMoreProducts} from './tools/show-products.js'
import {handleShowProduct} from './tools/show-product.js'
import {handleCompareProducts} from './tools/compare-products.js'
import {handleAnswerQuestion} from './tools/answer-question.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = resolve(__dirname, '..', 'dist')

/** Read a built HTML bundle from the dist/ directory. */
function readHtml(filename: string): string {
  const filePath = resolve(DIST_DIR, filename)
  if (!existsSync(filePath)) {
    throw new Error(`Widget HTML not found: ${filePath}. Run "npm run build:ui" first.`)
  }
  return readFileSync(filePath, 'utf-8')
}

/** Shared CSP config for all widgets — allows Sanity API + CDN access. */
const sanityCSP = {
  connectDomains: ['https://api.sanity.io'],
  resourceDomains: ['https://cdn.sanity.io'],
}

/**
 * Create and configure the MCP server.
 *
 * Returns the server instance — transport binding happens in main.ts.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    {name: 'ecommerce-mcp-ui', version: '0.1.0'},
    {capabilities: {resources: {}, tools: {}}},
  )

  // --- Capability detection ---
  // We register UI-enhanced tools by default. If the host doesn't support
  // MCP Apps, the _meta.ui will be ignored and tools work as text-only.
  // For hosts that DO support it, the ui:// resourceUri triggers widget rendering.

  // --- UI Resources (HTML bundles) ---
  const resources = [
    {
      name: 'Product Grid',
      uri: 'ui://ecommerce/product-grid.html',
      file: 'product-grid.html',
      description: 'Interactive product grid with search results',
    },
    {
      name: 'Product Card',
      uri: 'ui://ecommerce/product-card.html',
      file: 'product-card.html',
      description: 'Detailed product card with variants and pricing',
    },
    {
      name: 'Compare',
      uri: 'ui://ecommerce/compare.html',
      file: 'compare.html',
      description: 'Side-by-side product comparison view',
    },
  ]

  for (const res of resources) {
    registerAppResource(
      server,
      res.name,
      res.uri,
      {
        description: res.description,
        _meta: {ui: {csp: sanityCSP}},
      },
      async () => ({
        contents: [
          {
            uri: res.uri,
            mimeType: RESOURCE_MIME_TYPE,
            text: readHtml(res.file),
          },
        ],
      }),
    )
  }

  // --- Tools (model + app visible) ---

  registerAppTool(
    server,
    'show_products',
    {
      description:
        'Search and display products matching a query. Use for browsing, filtering, and discovering products.',
      inputSchema: {
        query: z.string().describe('Search query for products'),
        category: z.string().optional().describe('Filter by category slug'),
        maxPrice: z.number().optional().describe('Maximum price in USD'),
        limit: z.number().optional().default(12).describe('Number of results to return'),
      },
      annotations: {readOnlyHint: true},
      _meta: {
        ui: {
          resourceUri: 'ui://ecommerce/product-grid.html',
        },
      },
    },
    async ({query, category, maxPrice, limit}) => {
      const result = await handleShowProducts({query, category, maxPrice, limit})
      return {
        content: result.content,
        structuredContent: result.structuredContent,
        _meta: result._meta,
      }
    },
  )

  registerAppTool(
    server,
    'show_product',
    {
      description:
        'Show detailed information about a specific product including images, variants, pricing, and materials.',
      inputSchema: {
        productId: z.string().describe('The Sanity document _id of the product'),
      },
      annotations: {readOnlyHint: true},
      _meta: {
        ui: {
          resourceUri: 'ui://ecommerce/product-card.html',
        },
      },
    },
    async ({productId}) => {
      const result = await handleShowProduct({productId})
      return {
        content: result.content,
        structuredContent: result.structuredContent,
        _meta: result._meta,
      }
    },
  )

  registerAppTool(
    server,
    'compare_products',
    {
      description:
        'Compare products side by side on features, price, and materials. Provide 2-4 product IDs.',
      inputSchema: {
        productIds: z
          .array(z.string())
          .min(2)
          .max(4)
          .describe('Array of product _id values to compare'),
      },
      annotations: {readOnlyHint: true},
      _meta: {
        ui: {
          resourceUri: 'ui://ecommerce/compare.html',
        },
      },
    },
    async ({productIds}) => {
      const result = await handleCompareProducts({productIds})
      return {
        content: result.content,
        structuredContent: result.structuredContent,
        _meta: result._meta,
      }
    },
  )

  // --- Text-only tool (no UI) ---

  server.tool(
    'answer_question',
    'Answer general questions about products, materials, sizing, or the store. Returns text, no UI.',
    {
      question: z.string().describe("The user's question"),
    },
    async ({question}) => {
      const result = await handleAnswerQuestion({question})
      return {
        content: result.content,
      }
    },
  )

  // --- App-only tool (widget can call, LLM cannot see) ---

  registerAppTool(
    server,
    'load_more_products',
    {
      description: 'Load the next page of product results.',
      inputSchema: {
        query: z.string(),
        category: z.string().optional(),
        maxPrice: z.number().optional(),
        offset: z.number().describe('Number of products already loaded'),
        limit: z.number().optional().default(12),
      },
      annotations: {readOnlyHint: true},
      _meta: {
        ui: {
          resourceUri: 'ui://ecommerce/product-grid.html',
          visibility: ['app'] as ('model' | 'app')[],
        },
      },
    },
    async ({query, category, maxPrice, offset, limit}) => {
      const result = await handleLoadMoreProducts({
        query,
        category,
        maxPrice,
        offset,
        limit,
      })
      return {
        content: result.content,
        structuredContent: result.structuredContent,
        _meta: result._meta,
      }
    },
  )

  return server
}
