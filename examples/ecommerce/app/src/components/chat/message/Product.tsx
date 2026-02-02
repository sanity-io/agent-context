'use client'

import Image from 'next/image'
import Link from 'next/link'
import {useEffect, useState} from 'react'

import {client} from '@/sanity/lib/client'
import {urlFor} from '@/sanity/lib/image'

import type {DocumentProps} from './Document'

interface ProductData {
  slug: string
  title: string
  image: {asset: {_ref: string}} | null
}

const getProduct = async (id: string): Promise<ProductData | null> => {
  const product = await client.fetch(
    `*[_type == "product" && _id == $id][0] {
      title,
      "slug": slug.current,
      "image": variants[0].images[0],
    }
  `,
    {id},
  )

  return product
}

export function Product(props: DocumentProps) {
  const {isInline} = props

  const [product, setProduct] = useState<ProductData | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      const product = await getProduct(props.id)

      setProduct(product)
    }
    fetchProduct()
  }, [props.id])

  if (!product) return null

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
