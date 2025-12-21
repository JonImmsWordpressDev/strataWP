/**
 * Image Utilities for Headless WordPress
 */

import type { WPMedia, WPMediaSize } from '../types/wordpress.js'

export interface ImageOptions {
  width?: number
  height?: number
  quality?: number
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside'
}

/**
 * Get responsive image srcset from WordPress media
 */
export function getImageSrcSet(media: WPMedia): string {
  if (!media.media_details?.sizes) {
    return `${media.source_url} ${media.media_details?.width || 1}w`
  }

  const sizes = Object.values(media.media_details.sizes)
    .filter((size): size is WPMediaSize => !!size.source_url)
    .sort((a, b) => a.width - b.width)

  const srcSet = sizes.map((size) => `${size.source_url} ${size.width}w`).join(', ')

  return srcSet || `${media.source_url} ${media.media_details.width}w`
}

/**
 * Get image sizes attribute
 */
export function getImageSizes(maxWidth: number = 1200): string {
  return `(max-width: ${maxWidth}px) 100vw, ${maxWidth}px`
}

/**
 * Get optimized image URL
 */
export function getOptimizedImageUrl(
  media: WPMedia,
  options: ImageOptions = {}
): string {
  const { width, height } = options

  if (!width && !height) {
    return media.source_url
  }

  // Find closest matching size
  if (media.media_details?.sizes) {
    const sizes = Object.values(media.media_details.sizes).filter(
      (size): size is WPMediaSize => !!size.source_url
    )

    if (width) {
      const matchingSize = sizes
        .filter((size) => size.width >= width)
        .sort((a, b) => a.width - b.width)[0]

      if (matchingSize) {
        return matchingSize.source_url
      }
    }
  }

  return media.source_url
}

/**
 * Get image blur data URL for placeholder
 */
export function getImageBlurDataUrl(media: WPMedia): string {
  // Use thumbnail size for blur placeholder
  const thumbnail = media.media_details?.sizes?.thumbnail

  if (thumbnail) {
    return thumbnail.source_url
  }

  return media.source_url
}

/**
 * Get image dimensions
 */
export function getImageDimensions(media: WPMedia): {
  width: number
  height: number
} {
  return {
    width: media.media_details?.width || 0,
    height: media.media_details?.height || 0,
  }
}

/**
 * Get image alt text
 */
export function getImageAlt(media: WPMedia): string {
  return media.alt_text || media.title.rendered || ''
}

/**
 * Check if media is an image
 */
export function isImage(media: WPMedia): boolean {
  return media.media_type === 'image'
}

/**
 * Generate Next.js Image component props
 */
export function getNextImageProps(
  media: WPMedia,
  options: ImageOptions = {}
) {
  const { width, height, quality = 75 } = options
  const dimensions = getImageDimensions(media)

  return {
    src: media.source_url,
    alt: getImageAlt(media),
    width: width || dimensions.width,
    height: height || dimensions.height,
    quality,
    blurDataURL: getImageBlurDataUrl(media),
    placeholder: 'blur' as const,
  }
}
