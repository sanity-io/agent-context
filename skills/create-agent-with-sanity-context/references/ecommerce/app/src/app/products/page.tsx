import {ProductGrid} from '@/components/product-grid'
import {ProductPagination} from '@/components/product-pagination'
import {client} from '@/sanity/lib/client'
import {PAGE_SIZE, PRODUCTS_COUNT_QUERY, PRODUCTS_PAGINATED_QUERY} from '@/sanity/queries'

export const metadata = {
  title: 'All Products | Store',
  description: 'Browse our collection of quality essentials.',
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{page?: string}>
}) {
  const {page} = await searchParams
  const currentPage = Number(page) || 1

  const [products, totalCount] = await Promise.all([
    client.fetch(PRODUCTS_PAGINATED_QUERY, {page: currentPage}),
    client.fetch(PRODUCTS_COUNT_QUERY),
  ])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <h1 className="mb-8 text-2xl font-semibold">All Products</h1>

      <ProductGrid products={products} />

      {totalPages > 1 && <ProductPagination currentPage={currentPage} totalPages={totalPages} />}
    </main>
  )
}
