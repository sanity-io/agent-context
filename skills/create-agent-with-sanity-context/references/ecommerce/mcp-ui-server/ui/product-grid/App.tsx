import '../shared/styles.css'
import React, {useEffect, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {
  initializeBridge,
  useToolResult,
  useCallServerTool,
  callServerTool,
  updateModelContext,
} from '../shared/bridge'
import {sanityImageUrl} from '../shared/sanity-image'

// ---------- Types ----------

interface Product {
  _id: string
  title: string
  slug: string
  shortDescription?: string
  price: {amount: number; compareAtPrice?: number}
  image?: {_ref: string}
  category?: {title: string; slug: string}
}

interface GridData {
  products: Product[]
  query: string
  filters: {category?: string; maxPrice?: number}
  totalCount: number
  offset: number
  limit: number
  hasMore: boolean
}

// ---------- Component ----------

function ProductGrid() {
  const {data, meta, isPending} = useToolResult<GridData>()
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const loadMore = useCallServerTool<GridData>('load_more_products')

  const projectId = (meta?.sanityProjectId as string) || ''
  const dataset = (meta?.sanityDataset as string) || 'production'

  // Accumulate products from initial result
  useEffect(() => {
    if (data?.products) {
      setAllProducts(data.products)
      setHasMore(data.hasMore)
      setOffset(data.offset + data.products.length)
    }
  }, [data])

  // Accumulate products from load_more results
  useEffect(() => {
    if (loadMore.data?.products) {
      setAllProducts((prev) => [...prev, ...loadMore.data!.products])
      setHasMore(loadMore.data.hasMore)
      setOffset((loadMore.data.offset ?? 0) + loadMore.data.products.length)
    }
  }, [loadMore.data])

  // Update model context
  useEffect(() => {
    if (allProducts.length > 0) {
      updateModelContext({
        viewingProducts: allProducts.map((p) => p.title).join(', '),
        totalShown: allProducts.length,
        totalAvailable: data?.totalCount ?? 0,
      })
    }
  }, [allProducts, data?.totalCount])

  if (isPending) {
    return <div className="loading">Searching products</div>
  }

  if (!data || allProducts.length === 0) {
    return (
      <div style={{padding: 'var(--space-6)', textAlign: 'center'}}>
        <p className="text-secondary">No products found.</p>
        <p className="text-muted text-sm" style={{marginTop: 'var(--space-2)'}}>
          Try a different search query.
        </p>
      </div>
    )
  }

  const handleProductClick = (product: Product) => {
    callServerTool('show_product', {productId: product._id})
  }

  const handleLoadMore = () => {
    loadMore.callTool({
      query: data.query,
      category: data.filters.category,
      maxPrice: data.filters.maxPrice,
      offset,
      limit: data.limit,
    })
  }

  return (
    <div style={{padding: 'var(--space-4)'}}>
      {/* Header */}
      <div
        style={{
          marginBottom: 'var(--space-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <h2 className="text-lg font-semibold">{data.query}</h2>
        <span className="text-sm text-muted">
          {allProducts.length} of {data.totalCount}
        </span>
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {allProducts.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            projectId={projectId}
            dataset={dataset}
            onClick={() => handleProductClick(product)}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div style={{textAlign: 'center', marginTop: 'var(--space-6)'}}>
          <button
            className="btn btn-primary"
            onClick={handleLoadMore}
            disabled={loadMore.isPending}
          >
            {loadMore.isPending ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}

// ---------- Product Card Sub-Component ----------

function ProductCard({
  product,
  projectId,
  dataset,
  onClick,
}: {
  product: Product
  projectId: string
  dataset: string
  onClick: () => void
}) {
  const imgUrl = sanityImageUrl(product.image, projectId, dataset, {
    width: 400,
    height: 400,
    fit: 'crop',
  })

  const hasDiscount =
    product.price.compareAtPrice && product.price.compareAtPrice > product.price.amount

  return (
    <div
      className="card"
      onClick={onClick}
      style={{cursor: 'pointer', transition: 'transform 0.15s ease'}}
      data-llm={`Product: ${product.title}, $${product.price.amount}${product.category ? `, ${product.category.title}` : ''}`}
    >
      {/* Image */}
      <div
        style={{
          aspectRatio: '1',
          overflow: 'hidden',
          background: 'var(--color-surface)',
        }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product.title}
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
            loading="lazy"
          />
        ) : (
          <div className="img-placeholder" style={{width: '100%', height: '100%'}}>
            No image
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{padding: 'var(--space-3)'}}>
        {product.category && (
          <span
            className="text-xs text-muted"
            style={{display: 'block', marginBottom: 'var(--space-1)'}}
          >
            {product.category.title}
          </span>
        )}
        <h3 className="text-sm font-medium truncate" title={product.title}>
          {product.title}
        </h3>
        <div
          style={{
            marginTop: 'var(--space-1)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span className={`text-sm ${hasDiscount ? 'price-sale font-semibold' : 'price'}`}>
            ${product.price.amount}
          </span>
          {hasDiscount && (
            <span className="text-xs price-compare">${product.price.compareAtPrice}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Mount ----------

initializeBridge('ecommerce-product-grid', '1.0.0')
createRoot(document.getElementById('root')!).render(<ProductGrid />)
