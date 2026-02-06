/**
 * show_product — Show detailed information about a specific product.
 *
 * Fetches full product data with dereferenced variants, materials, brand,
 * and category from the upstream Context MCP.
 */

import {callUpstream} from '../upstream.js'

interface ShowProductInput {
  productId: string
}

export async function handleShowProduct(input: ShowProductInput) {
  const {productId} = input

  const groq = `*[_type == "product" && _id == $productId][0] {
    _id, title, "slug": slug.current, sku, shortDescription, description,
    price { amount, compareAtPrice },
    "category": category->{ _id, title, "slug": slug.current },
    "brand": brand->{ _id, title: name, "slug": slug.current, description },
    "materials": materials[]->{ _id, title, composition },
    tags, features, careInstructions,
    "variants": variants[] {
      "color": color->{ _id, title, "slug": slug.current, hexValue },
      "sizes": sizes[]->{ _id, title, code, sortOrder },
      sku, available,
      "images": images[] { asset, alt }
    }
  }`

  const result = await callUpstream('groq_query', {
    query: groq,
    params: {productId},
  })

  const textContent = result.content?.find((c: {type: string}) => c.type === 'text')
  let product: Record<string, unknown> | null = null
  if (textContent && 'text' in textContent) {
    try {
      product = JSON.parse(textContent.text as string)
    } catch {
      /* empty */
    }
  }

  if (!product) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Product "${productId}" not found.`,
        },
      ],
      structuredContent: {error: 'not_found', productId},
    }
  }

  // Split data: structuredContent gets the essentials for the LLM,
  // _meta gets the full variant images (large payload) for the widget only.
  const variants = (product.variants as Array<Record<string, unknown>>) || []
  const variantSummary = variants.map((v) => ({
    color: v.color,
    sizes: v.sizes,
    sku: v.sku,
    available: v.available,
    imageCount: Array.isArray(v.images) ? v.images.length : 0,
  }))

  const structuredContent = {
    ...product,
    variants: variantSummary,
  }

  const title = product.title || 'Product'
  const price = product.price as {amount?: number; compareAtPrice?: number} | undefined

  return {
    content: [
      {
        type: 'text' as const,
        text: `Showing details for "${title}"${price?.amount ? ` — $${price.amount}` : ''}.`,
      },
    ],
    structuredContent,
    _meta: {
      sanityProjectId: process.env.SANITY_PROJECT_ID,
      sanityDataset: process.env.SANITY_DATASET || 'production',
      // Full variant data with all images — only the widget reads this
      fullVariants: variants,
    },
  }
}
