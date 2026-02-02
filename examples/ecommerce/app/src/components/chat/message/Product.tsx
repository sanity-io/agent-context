import Image from 'next/image'
import Link from 'next/link'

interface ProductProps {
  slug?: string
  title?: string
  image?: string
  isInline?: boolean
}

export function Product(props: ProductProps) {
  const {slug, title, image, isInline} = props

  if (!slug || !title) return null

  if (isInline) {
    return (
      <Link href={`/products/${slug}`} className="text-blue-600 underline hover:text-blue-700">
        {title}
      </Link>
    )
  }

  return (
    <Link
      href={`/products/${slug}`}
      className="flex items-center gap-3 rounded-md border border-neutral-200 bg-white p-2 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-neutral-100">
        {image && <Image src={image} alt={title} fill className="object-cover" />}
      </div>

      <span className="text-sm font-medium text-neutral-900">{title}</span>
    </Link>
  )
}
