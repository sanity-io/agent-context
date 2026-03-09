import type {ToolSet} from 'ai'
import {z} from 'zod'

/**
 * Lightweight context sent with every request.
 */
export interface DocumentContext {
  title: string
  description?: string
  pathname: string
}

/**
 * Schema for product filter parameters.
 */
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

export type ProductFiltersInput = z.infer<typeof productFiltersSchema>

export const CLIENT_TOOL_NAMES = {
  PAGE_CONTEXT: 'get_page_context',
  SCREENSHOT: 'get_page_screenshot',
  SET_FILTERS: 'set_product_filters',
} as const

/**
 * Client-side tools handled in the browser.
 */
export const clientTools = {
  [CLIENT_TOOL_NAMES.PAGE_CONTEXT]: {
    description: `Get the current page content as markdown. Use when you need to know what's visible on the page.`,
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
} satisfies ToolSet
