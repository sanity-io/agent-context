import type {PRODUCTS_QUERY_RESULT} from '../../sanity.types'
import {ProductCard} from './product-card'

interface ProductGridProps {
  products: PRODUCTS_QUERY_RESULT
}

export function ProductGrid({products}: ProductGridProps) {
  if (!products.length) {
    return <div className="py-12 text-center text-neutral-500">No products found.</div>
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  )
}
