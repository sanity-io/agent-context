import Image from 'next/image'
import Link from 'next/link'

import {Badge} from '@/components/ui/badge'
import {formatPrice} from '@/lib/utils'
import {urlFor} from '@/sanity/lib/image'

import type {PRODUCTS_QUERY_RESULT} from '../../sanity.types'

type Product = PRODUCTS_QUERY_RESULT[number]

interface ProductCardProps {
  product: Product
}

export function ProductCard({product}: ProductCardProps) {
  const {title, slug, image, price, category, brand} = product
  const hasDiscount = price?.compareAtPrice && price.compareAtPrice > (price.amount ?? 0)

  return (
    <Link href={`/products/${slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100">
        {image?.asset?.url ? (
          <Image
            src={urlFor(image).width(600).height(800).url()}
            alt={image.alt || title || 'Product image'}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            placeholder={image.asset.metadata?.lqip ? 'blur' : 'empty'}
            blurDataURL={image.asset.metadata?.lqip || undefined}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-400">No image</div>
        )}

        {hasDiscount && (
          <Badge className="absolute left-2 top-2" variant="destructive">
            Sale
          </Badge>
        )}
      </div>

      <div className="mt-3 space-y-1">
        {(brand?.title || category?.title) && (
          <p className="text-xs text-neutral-500">
            {brand?.title}

            {brand?.title && category?.title && ' · '}

            {category?.title}
          </p>
        )}

        <h3 className="text-sm font-medium text-neutral-900 group-hover:underline">{title}</h3>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{formatPrice(price?.amount)}</span>

          {hasDiscount && (
            <span className="text-sm text-neutral-500 line-through">
              {formatPrice(price?.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
