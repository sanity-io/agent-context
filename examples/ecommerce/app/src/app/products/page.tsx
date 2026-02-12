import {Suspense} from 'react'

import {FilterBar} from '@/components/filter-bar'
import {ProductGrid} from '@/components/product-grid'
import {ProductPagination} from '@/components/product-pagination'
import {type ProductFiltersInput} from '@/lib/client-tools'
import {client} from '@/sanity/lib/client'
import {FILTER_OPTIONS_QUERY} from '@/sanity/queries/filters'
import {
  buildFilteredProductsCountQuery,
  buildFilteredProductsQuery,
  PAGE_SIZE,
  SORT_OPTIONS,
} from '@/sanity/queries/products'

import type {FILTER_OPTIONS_QUERY_RESULT} from '../../../sanity.types'

export const metadata = {
  title: 'All Products | Store',
  description: 'Browse our collection of quality essentials.',
}

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string
    category?: string | string[]
    color?: string | string[]
    size?: string | string[]
    brand?: string | string[]
    minPrice?: string
    maxPrice?: string
    sort?: string
  }>
}

/** Convert URL param (string or string[]) to string[] or undefined */
function toArray(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) return value.length > 0 ? value : undefined
  return [value]
}

export default async function ProductsPage({searchParams}: ProductsPageProps) {
  const params = await searchParams
  const currentPage = Number(params.page) || 1

  // Build filters from URL params (multi-value params become arrays)
  const validSort = SORT_OPTIONS.find((s) => s.value === params.sort)
  const filters: ProductFiltersInput = {
    category: toArray(params.category),
    color: toArray(params.color),
    size: toArray(params.size),
    brand: toArray(params.brand),
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    sort: validSort?.value,
  }

  // Build dynamic queries based on filters
  const productsQuery = buildFilteredProductsQuery(filters)
  const countQuery = buildFilteredProductsCountQuery(filters)

  // Fetch filter options, products, and count in parallel
  const [filterOptions, products, totalCount] = await Promise.all([
    client.fetch(FILTER_OPTIONS_QUERY),
    client.fetch(productsQuery, {page: currentPage}),
    client.fetch<number>(countQuery),
  ])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Generate description based on active filters
  const activeFilterLabels = getActiveFilterLabels(filters, filterOptions)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold">
          {activeFilterLabels.length > 0 ? activeFilterLabels.join(' · ') : 'All Products'}
        </h1>

        <p className="text-sm text-neutral-500">
          {`${totalCount} ${totalCount === 1 ? 'product' : 'products'}`}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="mb-8">
        <Suspense fallback={<FilterBarSkeleton />}>
          <FilterBar filterOptions={filterOptions} />
        </Suspense>
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="py-16 text-center">
          <p className="text-neutral-500">No products match your filters.</p>

          <p className="mt-2 text-sm text-neutral-400">
            Try adjusting or clearing some filters to see more results.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && <ProductPagination currentPage={currentPage} totalPages={totalPages} />}
    </main>
  )
}

/**
 * Generate human-readable labels for active filters
 */
function getActiveFilterLabels(
  filters: ProductFiltersInput,
  options: FILTER_OPTIONS_QUERY_RESULT,
): string[] {
  const labels: string[] = []

  if (filters.category?.length) {
    const names = filters.category
      .map((slug) => options.categories.find((c) => c.slug === slug)?.title)
      .filter(Boolean)
    if (names.length) labels.push(names.join(', '))
  }

  if (filters.brand?.length) {
    const names = filters.brand
      .map((slug) => options.brands.find((b) => b.slug === slug)?.title)
      .filter(Boolean)
    if (names.length) labels.push(names.join(', '))
  }

  if (filters.color?.length) {
    const names = filters.color
      .map((slug) => options.colors.find((c) => c.slug === slug)?.title)
      .filter(Boolean)
    if (names.length) labels.push(names.join(', '))
  }

  if (filters.size?.length) {
    const codes = filters.size.filter((code) => options.sizes.some((s) => s.code === code))
    if (codes.length) labels.push(`Size ${codes.join(', ')}`)
  }

  if (filters.maxPrice) {
    labels.push(`Under $${filters.maxPrice}`)
  }

  return labels
}

function FilterBarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {Array.from({length: 6}).map((_, i) => (
        <div key={i} className="h-9 w-[140px] animate-pulse rounded-md bg-neutral-100" />
      ))}
    </div>
  )
}
