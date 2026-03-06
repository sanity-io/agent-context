'use client'

import Image from 'next/image'
import Link from 'next/link'
import {useEffect, useState} from 'react'

import {client} from '@/sanity/lib/client'
import {urlFor} from '@/sanity/lib/image'

interface ProductProps {
  id: string
  isInline?: boolean
}

const QUERY = `
  *[_type == "product" && _id == $id][0] {
    title,
    "slug": slug.current,
    "image": variants[0].images[0],
  }
`

interface ProductData {
  slug: string
  title: string
  image: {asset: {_ref: string}} | null
}

export function Product(props: ProductProps) {
  const {isInline} = props

  const [product, setProduct] = useState<ProductData | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      try {
        const product = await client.fetch(QUERY, {id: props.id})

        setProduct(product)
      } catch (error) {
        setError(error instanceof Error ? error : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [props.id])

  if (loading) {
    if (isInline) return null

    return (
      <div className="flex animate-pulse items-center gap-3 rounded-md border border-neutral-200 bg-white p-2">
        <div className="h-10 w-10 shrink-0 rounded bg-neutral-100" />

        <div className="h-5 w-24 rounded bg-neutral-100" />
      </div>
    )
  }

  if (error || !product) return null

  if (isInline) {
    return (
      <Link
        href={`/products/${product.slug}`}
        className="text-blue-600 underline hover:text-blue-700"
      >
        {product.title}
      </Link>
    )
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="flex items-center gap-3 rounded-md border border-neutral-200 bg-white p-2 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-neutral-100">
        {product.image && (
          <Image
            src={urlFor(product.image).width(80).height(80).url()}
            alt={product.title}
            fill
            className="object-cover"
          />
        )}
      </div>

      <span className="text-sm font-medium text-neutral-900">{product.title}</span>
    </Link>
  )
}
