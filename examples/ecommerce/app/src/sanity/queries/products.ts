import {defineQuery} from 'next-sanity'

import {
  brandFragment,
  categoryFragment,
  imageFragment,
  priceFragment,
  variantFragment,
} from './fragments'

// Product card data (for grids/listings)
export const PRODUCTS_QUERY = defineQuery(/* groq */ `
  *[_type == "product" && defined(slug.current)] | order(_createdAt desc) {
    _id,
    title,
    "slug": slug.current,
    shortDescription,
    "category": category->{ ${categoryFragment} },
    "brand": brand->{ ${brandFragment} },
    "image": variants[0].images[0] { ${imageFragment} },
    price { ${priceFragment} }
  }
`)

// Featured products for homepage (limited)
export const FEATURED_PRODUCTS_QUERY = defineQuery(/* groq */ `
  *[_type == "product" && defined(slug.current)] | order(_createdAt desc) [0...8] {
    _id,
    title,
    "slug": slug.current,
    shortDescription,
    "category": category->{ ${categoryFragment} },
    "brand": brand->{ ${brandFragment} },
    "image": variants[0].images[0] { ${imageFragment} },
    price { ${priceFragment} }
  }
`)

// Single product with full details
export const PRODUCT_QUERY = defineQuery(/* groq */ `
  *[_type == "product" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    sku,
    shortDescription,
    description,
    features,
    careInstructions,
    "category": category->{ ${categoryFragment} },
    "brand": brand->{ ${brandFragment} },
    price { ${priceFragment} },
    "materials": materials[]->{ _id, title },
    "variants": variants[] { ${variantFragment} }
  }
`)

// Product slugs for static generation
export const PRODUCT_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "product" && defined(slug.current)] {
    "slug": slug.current
  }
`)

// Pagination constants (multiple of 4 for grid layout)
export const PAGE_SIZE = 48

// Paginated products query (uses $page parameter, 1-indexed)
export const PRODUCTS_PAGINATED_QUERY = defineQuery(/* groq */ `
  *[_type == "product" && defined(slug.current)] 
    | order(_createdAt desc) 
    [($page - 1) * ${PAGE_SIZE}...$page * ${PAGE_SIZE}] {
    _id,
    title,
    "slug": slug.current,
    shortDescription,
    "category": category->{ ${categoryFragment} },
    "brand": brand->{ ${brandFragment} },
    "image": variants[0].images[0] { ${imageFragment} },
    price { ${priceFragment} }
  }
`)

// Total product count for pagination
export const PRODUCTS_COUNT_QUERY = defineQuery(/* groq */ `
  count(*[_type == "product" && defined(slug.current)])
`)
