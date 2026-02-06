import '../shared/styles.css'
import React, {useEffect} from 'react'
import {createRoot} from 'react-dom/client'
import {initializeBridge, useToolResult, callServerTool, updateModelContext} from '../shared/bridge'
import {sanityImageUrl} from '../shared/sanity-image'

// ---------- Types ----------

interface Variant {
  color?: {title: string; hexValue?: string}
  sizes?: Array<{title: string; code: string}>
  available: boolean
  image?: {_ref: string}
}

interface Product {
  _id: string
  title: string
  slug: string
  shortDescription?: string
  price: {amount: number; compareAtPrice?: number}
  category?: {title: string; slug: string}
  brand?: {title: string}
  materials?: Array<{title: string; composition?: string}>
  tags?: string[]
  features?: string[]
  variants?: Variant[]
}

interface CompareData {
  products: Product[]
  comparisonFields: string[]
}

// ---------- Component ----------

function CompareProducts() {
  const {data, meta, isPending} = useToolResult<CompareData>()

  const projectId = (meta?.sanityProjectId as string) || ''
  const dataset = (meta?.sanityDataset as string) || 'production'

  // Update model context
  useEffect(() => {
    if (data?.products?.length) {
      updateModelContext({
        comparing: data.products.map((p) => p.title).join(' vs '),
      })
    }
  }, [data])

  if (isPending) {
    return <div className="loading">Loading comparison</div>
  }

  if (!data || !data.products?.length) {
    return (
      <div style={{padding: 'var(--space-6)', textAlign: 'center'}}>
        <p className="text-secondary">No products to compare.</p>
      </div>
    )
  }

  const {products} = data
  const lowestPrice = Math.min(...products.map((p) => p.price.amount))

  const handleViewProduct = (productId: string) => {
    callServerTool('show_product', {productId})
  }

  return (
    <div style={{padding: 'var(--space-4)', overflowX: 'auto'}}>
      <h2 className="text-lg font-semibold" style={{marginBottom: 'var(--space-4)'}}>
        Comparing {products.length} Products
      </h2>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: 'left',
                padding: 'var(--space-3)',
                borderBottom: '2px solid var(--color-border)',
                width: 120,
                color: 'var(--color-text-muted)',
                fontWeight: 500,
              }}
            />
            {products.map((product) => (
              <th
                key={product._id}
                style={{
                  textAlign: 'center',
                  padding: 'var(--space-3)',
                  borderBottom: '2px solid var(--color-border)',
                  minWidth: 180,
                }}
              >
                <button
                  onClick={() => handleViewProduct(product._id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'inherit',
                  }}
                >
                  <div data-llm={`Comparing: ${product.title}, $${product.price.amount}`}>
                    {/* Product Image */}
                    <div
                      style={{
                        width: 120,
                        height: 120,
                        margin: '0 auto var(--space-2)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {product.variants?.[0]?.image ? (
                        <img
                          src={
                            sanityImageUrl(product.variants[0].image, projectId, dataset, {
                              width: 240,
                              height: 240,
                              fit: 'crop',
                            }) || ''
                          }
                          alt={product.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div className="img-placeholder" style={{width: '100%', height: '100%'}}>
                          No image
                        </div>
                      )}
                    </div>
                    <span className="font-semibold">{product.title}</span>
                  </div>
                </button>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Price Row */}
          <CompareRow label="Price">
            {products.map((p) => (
              <td key={p._id} style={cellStyle}>
                <span
                  className={`font-semibold ${p.price.amount === lowestPrice ? 'text-success' : ''}`}
                >
                  ${p.price.amount}
                </span>
                {p.price.compareAtPrice && p.price.compareAtPrice > p.price.amount && (
                  <span className="price-compare text-xs" style={{marginLeft: 'var(--space-1)'}}>
                    ${p.price.compareAtPrice}
                  </span>
                )}
              </td>
            ))}
          </CompareRow>

          {/* Category Row */}
          <CompareRow label="Category">
            {products.map((p) => (
              <td key={p._id} style={cellStyle}>
                {p.category?.title || '—'}
              </td>
            ))}
          </CompareRow>

          {/* Brand Row */}
          <CompareRow label="Brand">
            {products.map((p) => (
              <td key={p._id} style={cellStyle}>
                {p.brand?.title || '—'}
              </td>
            ))}
          </CompareRow>

          {/* Materials Row */}
          <CompareRow label="Materials">
            {products.map((p) => (
              <td key={p._id} style={cellStyle}>
                {p.materials?.length ? p.materials.map((m) => m.title).join(', ') : '—'}
              </td>
            ))}
          </CompareRow>

          {/* Features Row */}
          <CompareRow label="Features">
            {products.map((p) => (
              <td key={p._id} style={cellStyle}>
                {p.features?.length ? (
                  <ul style={{paddingLeft: 'var(--space-4)', margin: 0}}>
                    {p.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  '—'
                )}
              </td>
            ))}
          </CompareRow>

          {/* Available Sizes Row */}
          <CompareRow label="Sizes">
            {products.map((p) => {
              const allSizes = new Set<string>()
              p.variants?.forEach((v) => {
                v.sizes?.forEach((s) => allSizes.add(s.code))
              })
              return (
                <td key={p._id} style={cellStyle}>
                  {allSizes.size > 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--space-1)',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                      }}
                    >
                      {Array.from(allSizes).map((code) => (
                        <span key={code} className="badge">
                          {code}
                        </span>
                      ))}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
              )
            })}
          </CompareRow>

          {/* Colors Row */}
          <CompareRow label="Colors">
            {products.map((p) => (
              <td key={p._id} style={cellStyle}>
                {p.variants?.length ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--space-1)',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                    }}
                  >
                    {p.variants
                      .filter((v) => v.color)
                      .map((v, i) => (
                        <span
                          key={i}
                          title={v.color!.title}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: v.color!.hexValue || 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            display: 'inline-block',
                          }}
                        />
                      ))}
                  </div>
                ) : (
                  '—'
                )}
              </td>
            ))}
          </CompareRow>
        </tbody>
      </table>
    </div>
  )
}

// ---------- Helpers ----------

const cellStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: 'var(--space-3)',
  borderBottom: '1px solid var(--color-border)',
  verticalAlign: 'top',
}

function CompareRow({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <tr>
      <td
        style={{
          ...cellStyle,
          textAlign: 'left',
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </td>
      {children}
    </tr>
  )
}

// ---------- Mount ----------

initializeBridge('ecommerce-compare', '1.0.0')
createRoot(document.getElementById('root')!).render(<CompareProducts />)
