import Link from 'next/link'

import {ProductGrid} from '@/components/product-grid'
import {Button} from '@/components/ui/button'
import {client} from '@/sanity/lib/client'
import {FEATURED_PRODUCTS_QUERY} from '@/sanity/queries'

export default async function HomePage() {
  const products = await client.fetch(FEATURED_PRODUCTS_QUERY)

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-neutral-200 bg-neutral-50 px-4 py-16 text-center md:py-24">
        <h1 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Quality essentials for everyday life
        </h1>

        <p className="mx-auto mt-4 max-w-md text-neutral-600">
          Thoughtfully designed clothing that combines comfort with timeless style.
        </p>

        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/products">Shop All</Link>
          </Button>
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <h2 className="mb-8 text-xl font-semibold">Featured Products</h2>

        <ProductGrid products={products} />
      </section>
    </main>
  )
}
