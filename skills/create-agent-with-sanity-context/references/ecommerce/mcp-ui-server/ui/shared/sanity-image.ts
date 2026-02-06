/**
 * Build Sanity CDN image URLs from asset references.
 *
 * Asset reference format: { _ref: "image-{id}-{width}x{height}-{format}" }
 * Output URL: https://cdn.sanity.io/images/{projectId}/{dataset}/{id}-{dimensions}.{format}
 */

interface AssetRef {
  _ref?: string
  _type?: string
}

interface ImageOptions {
  width?: number
  height?: number
  quality?: number
  fit?: 'clip' | 'crop' | 'fill' | 'max' | 'min' | 'scale'
}

/**
 * Build a Sanity CDN image URL from an asset reference.
 *
 * @param asset - Sanity image asset object with _ref
 * @param projectId - Sanity project ID
 * @param dataset - Sanity dataset name
 * @param options - Optional transform parameters (width, height, quality)
 */
export function sanityImageUrl(
  asset: AssetRef | null | undefined,
  projectId: string,
  dataset: string,
  options?: ImageOptions,
): string | null {
  if (!asset?._ref) return null

  // Parse the asset reference: image-{id}-{width}x{height}-{format}
  const parts = asset._ref.split('-')
  if (parts.length < 4 || parts[0] !== 'image') return null

  const id = parts[1]
  const dimensions = parts[2] // e.g., "800x600"
  const format = parts[3] // e.g., "jpg", "png", "webp"

  let url = `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}`

  // Add transform parameters
  const params = new URLSearchParams()
  if (options?.width) params.set('w', String(options.width))
  if (options?.height) params.set('h', String(options.height))
  if (options?.quality) params.set('q', String(options.quality))
  if (options?.fit) params.set('fit', options.fit)

  const paramStr = params.toString()
  if (paramStr) url += `?${paramStr}`

  return url
}

/**
 * Get the aspect ratio from a Sanity image asset reference.
 * Returns { width, height } parsed from the dimensions in the _ref.
 */
export function getImageDimensions(
  asset: AssetRef | null | undefined,
): {width: number; height: number} | null {
  if (!asset?._ref) return null

  const parts = asset._ref.split('-')
  if (parts.length < 4) return null

  const [w, h] = parts[2].split('x').map(Number)
  if (!w || !h) return null

  return {width: w, height: h}
}
