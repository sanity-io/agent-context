/**
 * show_products — Search and display products matching a query.
 *
 * Builds a GROQ query that combines structural filters (type, category, price)
 * with semantic search via text::embedding(), calls the upstream Context MCP,
 * and shapes the result for both the LLM (content text) and the widget
 * (structuredContent with product data).
 */

import {callUpstream} from '../upstream.js'

interface ShowProductsInput {
  query: string
  category?: string
  maxPrice?: number
  limit?: number
}

export async function handleShowProducts(input: ShowProductsInput) {
  const {query, category, maxPrice, limit = 12} = input

  // Build GROQ filter conditions
  const conditions = ['_type == "product"']
  const params: Record<string, unknown> = {query}

  if (category) {
    conditions.push('category->slug.current == $category')
    params.category = category
  }
  if (maxPrice !== undefined) {
    conditions.push('price.amount <= $maxPrice')
    params.maxPrice = maxPrice
  }

  const filter = conditions.join(' && ')
  const groq = `{
    "products": *[${filter}]
      | score(text::embedding($query))
      | order(_score desc) {
        _id, title, "slug": slug.current, shortDescription,
        price { amount, compareAtPrice },
        "image": variants[0].images[0].asset,
        "category": category->{ title, "slug": slug.current }
      }[0...${limit}],
    "total": count(*[${filter}])
  }`

  const result = await callUpstream('groq_query', {query: groq, params})

  // Extract the response text content
  const textContent = result.content?.find((c: {type: string}) => c.type === 'text')
  let data: {products: unknown[]; total: number} = {
    products: [],
    total: 0,
  }
  if (textContent && 'text' in textContent) {
    try {
      data = JSON.parse(textContent.text as string)
    } catch {
      // If parsing fails, return empty results
    }
  }

  const products = Array.isArray(data.products) ? data.products : []
  const total = typeof data.total === 'number' ? data.total : products.length

  const structuredContent = {
    products,
    query,
    filters: {category, maxPrice},
    totalCount: total,
    offset: 0,
    limit,
    hasMore: total > limit,
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: `Found ${total} product${total !== 1 ? 's' : ''} matching "${query}".${
          products.length > 0
            ? ` Showing the top ${products.length}.`
            : ' Try broadening your search.'
        }`,
      },
    ],
    structuredContent,
    _meta: {
      sanityProjectId: process.env.SANITY_PROJECT_ID,
      sanityDataset: process.env.SANITY_DATASET || 'production',
    },
  }
}

/**
 * load_more_products — Paginate to the next set of results.
 * App-only tool (widget can call, LLM cannot see).
 */
export async function handleLoadMoreProducts(input: ShowProductsInput & {offset: number}) {
  const {query, category, maxPrice, limit = 12, offset} = input

  const conditions = ['_type == "product"']
  const params: Record<string, unknown> = {query}

  if (category) {
    conditions.push('category->slug.current == $category')
    params.category = category
  }
  if (maxPrice !== undefined) {
    conditions.push('price.amount <= $maxPrice')
    params.maxPrice = maxPrice
  }

  const filter = conditions.join(' && ')
  const groq = `{
    "products": *[${filter}]
      | score(text::embedding($query))
      | order(_score desc) {
        _id, title, "slug": slug.current, shortDescription,
        price { amount, compareAtPrice },
        "image": variants[0].images[0].asset,
        "category": category->{ title, "slug": slug.current }
      }[${offset}...${offset + limit}],
    "total": count(*[${filter}])
  }`

  const result = await callUpstream('groq_query', {query: groq, params})

  const textContent = result.content?.find((c: {type: string}) => c.type === 'text')
  let data: {products: unknown[]; total: number} = {
    products: [],
    total: 0,
  }
  if (textContent && 'text' in textContent) {
    try {
      data = JSON.parse(textContent.text as string)
    } catch {
      /* empty */
    }
  }

  const products = Array.isArray(data.products) ? data.products : []
  const total = typeof data.total === 'number' ? data.total : 0

  return {
    content: [
      {
        type: 'text' as const,
        text: `Loaded ${products.length} more products (${offset + products.length} of ${total}).`,
      },
    ],
    structuredContent: {
      products,
      query,
      filters: {category, maxPrice},
      totalCount: total,
      offset,
      limit,
      hasMore: offset + limit < total,
    },
    _meta: {
      sanityProjectId: process.env.SANITY_PROJECT_ID,
      sanityDataset: process.env.SANITY_DATASET || 'production',
    },
  }
}
