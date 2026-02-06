import '../shared/styles.css'
import React, {useEffect, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {
  initializeBridge,
  useToolResult,
  sendMessage,
  openLink,
  updateModelContext,
} from '../shared/bridge'
import {sanityImageUrl} from '../shared/sanity-image'

// ---------- Types ----------

interface Color {
  _id: string
  title: string
  slug: string
  hexValue?: string
}

interface Size {
  _id: string
  title: string
  code: string
  sortOrder?: number
}

interface VariantSummary {
  color: Color
  sizes: Size[]
  sku: string
  available: boolean
  imageCount: number
}

interface FullVariant {
  color: Color
  sizes: Size[]
  sku: string
  available: boolean
  images: Array<{asset: {_ref: string}; alt?: string}>
}

interface ProductData {
  _id: string
  title: string
  slug: string
  sku: string
  shortDescription?: string
  description?: unknown[]
  price: {amount: number; compareAtPrice?: number}
  category?: {_id: string; title: string; slug: string}
  brand?: {_id: string; title: string; slug: string; description?: string}
  materials?: Array<{_id: string; title: string; composition?: string}>
  tags?: string[]
  features?: string[]
  careInstructions?: string
  variants: VariantSummary[]
}

// ---------- Component ----------

function ProductCard() {
  const {data, meta, isPending} = useToolResult<ProductData>()
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0)
  const [selectedImageIdx, setSelectedImageIdx] = useState(0)

  const projectId = (meta?.sanityProjectId as string) || ''
  const dataset = (meta?.sanityDataset as string) || 'production'
  const fullVariants = (meta?.fullVariants as FullVariant[] | undefined) || []

  // Update model context when product loads
  useEffect(() => {
    if (data) {
      updateModelContext({
        viewingProduct: `${data.title} ($${data.price.amount})`,
        productId: data._id,
      })
    }
  }, [data])

  if (isPending) {
    return <div className="loading">Loading product</div>
  }

  if (!data) {
    return (
      <div style={{padding: 'var(--space-6)', textAlign: 'center'}}>
        <p className="text-secondary">Product not found.</p>
      </div>
    )
  }

  const selectedVariant = fullVariants[selectedVariantIdx]
  const images = selectedVariant?.images || []
  const currentImage = images[selectedImageIdx]

  const hasDiscount = data.price.compareAtPrice && data.price.compareAtPrice > data.price.amount

  const handleCompare = () => {
    sendMessage(`Compare "${data.title}" with similar products`)
  }

  const handleViewOnSite = () => {
    openLink(`/products/${data.slug}`)
  }

  return (
    <div
      style={{padding: 'var(--space-4)'}}
      data-llm={`Viewing: ${data.title}, $${data.price.amount}, ${data.category?.title || 'uncategorized'}`}
    >
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)'}}>
        {/* Left: Image */}
        <div>
          <div
            style={{
              aspectRatio: '1',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            {currentImage ? (
              <img
                src={
                  sanityImageUrl(currentImage.asset, projectId, dataset, {
                    width: 600,
                    height: 600,
                    fit: 'crop',
                  }) || ''
                }
                alt={currentImage.alt || data.title}
                style={{width: '100%', height: '100%', objectFit: 'cover'}}
              />
            ) : (
              <div className="img-placeholder" style={{width: '100%', height: '100%'}}>
                No image
              </div>
            )}
          </div>

          {/* Image thumbnails */}
          {images.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-2)',
                marginTop: 'var(--space-3)',
                overflowX: 'auto',
              }}
            >
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImageIdx(i)}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    border:
                      i === selectedImageIdx
                        ? '2px solid var(--color-accent)'
                        : '1px solid var(--color-border)',
                    background: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={
                      sanityImageUrl(img.asset, projectId, dataset, {
                        width: 112,
                        height: 112,
                        fit: 'crop',
                      }) || ''
                    }
                    alt=""
                    style={{width: '100%', height: '100%', objectFit: 'cover'}}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div>
          {data.category && (
            <span className="badge" style={{marginBottom: 'var(--space-2)'}}>
              {data.category.title}
            </span>
          )}

          <h1 className="text-2xl font-bold" style={{marginBottom: 'var(--space-1)'}}>
            {data.title}
          </h1>

          {data.brand && (
            <p className="text-sm text-secondary" style={{marginBottom: 'var(--space-3)'}}>
              by {data.brand.title}
            </p>
          )}

          {/* Price */}
          <div
            style={{
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-2)',
            }}
          >
            <span className={`text-xl ${hasDiscount ? 'price-sale font-bold' : 'price'}`}>
              ${data.price.amount}
            </span>
            {hasDiscount && (
              <span className="text-sm price-compare">${data.price.compareAtPrice}</span>
            )}
          </div>

          {data.shortDescription && (
            <p className="text-sm text-secondary" style={{marginBottom: 'var(--space-4)'}}>
              {data.shortDescription}
            </p>
          )}

          {/* Color swatches */}
          {fullVariants.length > 1 && (
            <div style={{marginBottom: 'var(--space-4)'}}>
              <label
                className="text-xs font-medium text-secondary"
                style={{display: 'block', marginBottom: 'var(--space-2)'}}
              >
                Color: {fullVariants[selectedVariantIdx]?.color?.title}
              </label>
              <div style={{display: 'flex', gap: 'var(--space-2)'}}>
                {fullVariants.map((v, i) => (
                  <button
                    key={v.sku}
                    onClick={() => {
                      setSelectedVariantIdx(i)
                      setSelectedImageIdx(0)
                    }}
                    title={v.color?.title}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border:
                        i === selectedVariantIdx
                          ? '2px solid var(--color-accent)'
                          : '2px solid var(--color-border)',
                      background: v.color?.hexValue || 'var(--color-surface)',
                      cursor: 'pointer',
                      padding: 0,
                      outline: 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size chips */}
          {selectedVariant?.sizes && selectedVariant.sizes.length > 0 && (
            <div style={{marginBottom: 'var(--space-4)'}}>
              <label
                className="text-xs font-medium text-secondary"
                style={{display: 'block', marginBottom: 'var(--space-2)'}}
              >
                Sizes
              </label>
              <div style={{display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap'}}>
                {selectedVariant.sizes
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((size) => (
                    <span key={size._id} className="badge">
                      {size.code}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Materials */}
          {data.materials && data.materials.length > 0 && (
            <div style={{marginBottom: 'var(--space-4)'}}>
              <label
                className="text-xs font-medium text-secondary"
                style={{display: 'block', marginBottom: 'var(--space-2)'}}
              >
                Materials
              </label>
              <div style={{display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap'}}>
                {data.materials.map((m) => (
                  <span key={m._id} className="badge">
                    {m.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          {data.features && data.features.length > 0 && (
            <div style={{marginBottom: 'var(--space-4)'}}>
              <label
                className="text-xs font-medium text-secondary"
                style={{display: 'block', marginBottom: 'var(--space-2)'}}
              >
                Features
              </label>
              <ul style={{paddingLeft: 'var(--space-4)', color: 'var(--color-text-secondary)'}}>
                {data.features.map((f, i) => (
                  <li key={i} className="text-sm" style={{marginBottom: 'var(--space-1)'}}>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div style={{display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)'}}>
            <button className="btn btn-primary" onClick={handleViewOnSite}>
              View on Site
            </button>
            <button className="btn" onClick={handleCompare}>
              Compare
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- Mount ----------

initializeBridge('ecommerce-product-card', '1.0.0')
createRoot(document.getElementById('root')!).render(<ProductCard />)
