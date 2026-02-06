/**
 * compare_products — Compare products side by side.
 *
 * Fetches multiple products by ID from the upstream Context MCP
 * and shapes them for a comparison view.
 */

import {callUpstream} from '../upstream.js'

interface CompareProductsInput {
  productIds: string[]
}

export async function handleCompareProducts(input: CompareProductsInput) {
  const {productIds} = input

  const groq = `*[_type == "product" && _id in $ids] {
    _id, title, "slug": slug.current, shortDescription,
    price { amount, compareAtPrice },
    "category": category->{ title, "slug": slug.current },
    "brand": brand->{ title: name },
    "materials": materials[]->{ title, composition },
    tags, features,
    "variants": variants[] {
      "color": color->{ title, hexValue },
      "sizes": sizes[]->{ title, code },
      available,
      "image": images[0].asset
    }
  }`

  const result = await callUpstream('groq_query', {
    query: groq,
    params: {ids: productIds},
  })

  const textContent = result.content?.find((c: {type: string}) => c.type === 'text')
  let products: Array<Record<string, unknown>> = []
  if (textContent && 'text' in textContent) {
    try {
      const parsed = JSON.parse(textContent.text as string)
      products = Array.isArray(parsed) ? parsed : []
    } catch {
      /* empty */
    }
  }

  if (products.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'No products found for comparison. Check that the product IDs are correct.',
        },
      ],
      structuredContent: {products: [], comparisonFields: []},
    }
  }

  const comparisonFields = ['price', 'category', 'brand', 'materials', 'features', 'sizes']

  const names = products.map((p) => `"${p.title}"`).join(', ')

  return {
    content: [
      {
        type: 'text' as const,
        text: `Comparing ${products.length} products: ${names}.`,
      },
    ],
    structuredContent: {
      products,
      comparisonFields,
    },
    _meta: {
      sanityProjectId: process.env.SANITY_PROJECT_ID,
      sanityDataset: process.env.SANITY_DATASET || 'production',
    },
  }
}
