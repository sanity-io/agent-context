/**
 * Client tool definitions - shared between server and client.
 * No browser-specific code, safe to import anywhere.
 */

import type {ToolSet} from 'ai'
import {z} from 'zod'

/** User context sent with every message so the agent knows where the user is. */
export interface UserContext {
  documentTitle: string
  documentDescription?: string
  documentLocation: string
}

/** Zod schema for product filters - single source of truth */
export const productFiltersSchema = z.object({
  category: z.array(z.string()).optional().describe('Use slug.current from category documents'),
  color: z.array(z.string()).optional().describe('Use slug.current from color documents'),
  size: z
    .array(z.string())
    .optional()
    .describe('Use code from size documents, e.g. "L" not "Large"'),
  brand: z.array(z.string()).optional().describe('Use slug.current from brand documents'),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  sort: z.enum(['price-asc', 'price-desc', 'newest', 'title-asc']).optional(),
})

/** Product filters type derived from schema */
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>

/** Tool names - single source of truth for definitions (route.ts) and handlers (Chat.tsx). */
export const CLIENT_TOOL_NAMES = {
  PAGE_CONTEXT: 'get_page_context',
  SCREENSHOT: 'get_page_screenshot',
  SET_FILTERS: 'set_product_filters',
} as const

export const clientTools: ToolSet = {
  [CLIENT_TOOL_NAMES.PAGE_CONTEXT]: {
    description: `Get the current page as markdown (URL, title, text content). Use when you need to know what's visible on the page.`,
    inputSchema: z.object({}),
  },
  [CLIENT_TOOL_NAMES.SCREENSHOT]: {
    description: `Get a visual screenshot. Use when you need to see images, colors, or layout.`,
    inputSchema: z.object({}),
  },
  [CLIENT_TOOL_NAMES.SET_FILTERS]: {
    description: `Update product listing filters. First use groq_query to get valid filter values (slugs/codes) and confirm products exist.`,
    inputSchema: productFiltersSchema,
  },
}
