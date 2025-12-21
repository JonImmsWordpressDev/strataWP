/**
 * SEO Utilities for Headless WordPress
 */

import type { WPPost, WPPage, WPMedia } from '../types/wordpress.js'

export interface SEOMetadata {
  title: string
  description: string
  canonical?: string
  openGraph?: OpenGraphData
  twitter?: TwitterCardData
  robots?: RobotsData
}

export interface OpenGraphData {
  type: 'website' | 'article' | 'blog'
  title: string
  description: string
  url: string
  image?: string
  siteName?: string
  locale?: string
  article?: ArticleData
}

export interface ArticleData {
  publishedTime?: string
  modifiedTime?: string
  author?: string
  tags?: string[]
}

export interface TwitterCardData {
  card: 'summary' | 'summary_large_image' | 'app' | 'player'
  site?: string
  creator?: string
  title: string
  description: string
  image?: string
}

export interface RobotsData {
  index?: boolean
  follow?: boolean
  noarchive?: boolean
  nosnippet?: boolean
  maxImagePreview?: 'none' | 'standard' | 'large'
  maxVideoPreview?: number
  maxSnippet?: number
}

/**
 * Generate SEO metadata from post
 */
export function generatePostSEO(
  post: WPPost,
  siteUrl: string,
  siteName: string,
  featuredImage?: WPMedia
): SEOMetadata {
  const title = post.title.rendered
  const description = extractExcerpt(post.excerpt.rendered, 160)
  const canonical = `${siteUrl}/${post.slug}`

  return {
    title,
    description,
    canonical,
    openGraph: {
      type: 'article',
      title,
      description,
      url: canonical,
      image: featuredImage?.source_url,
      siteName,
      article: {
        publishedTime: post.date,
        modifiedTime: post.modified,
      },
    },
    twitter: {
      card: featuredImage ? 'summary_large_image' : 'summary',
      title,
      description,
      image: featuredImage?.source_url,
    },
    robots: {
      index: post.status === 'publish',
      follow: true,
      maxImagePreview: 'large',
    },
  }
}

/**
 * Generate SEO metadata from page
 */
export function generatePageSEO(
  page: WPPage,
  siteUrl: string,
  siteName: string,
  featuredImage?: WPMedia
): SEOMetadata {
  const title = page.title.rendered
  const description = extractExcerpt(page.excerpt.rendered, 160)
  const canonical = `${siteUrl}/${page.slug}`

  return {
    title,
    description,
    canonical,
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonical,
      image: featuredImage?.source_url,
      siteName,
    },
    twitter: {
      card: featuredImage ? 'summary_large_image' : 'summary',
      title,
      description,
      image: featuredImage?.source_url,
    },
    robots: {
      index: page.status === 'publish',
      follow: true,
      maxImagePreview: 'large',
    },
  }
}

/**
 * Extract plain text excerpt from HTML
 */
export function extractExcerpt(html: string, maxLength: number = 160): string {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, '')

  // Decode HTML entities
  const decoded = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')

  // Trim to max length
  if (decoded.length <= maxLength) {
    return decoded.trim()
  }

  return decoded.substring(0, maxLength).trim() + '...'
}

/**
 * Generate robots meta content
 */
export function generateRobotsContent(robots: RobotsData): string {
  const parts: string[] = []

  if (robots.index === false) parts.push('noindex')
  if (robots.follow === false) parts.push('nofollow')
  if (robots.noarchive) parts.push('noarchive')
  if (robots.nosnippet) parts.push('nosnippet')
  if (robots.maxImagePreview) parts.push(`max-image-preview:${robots.maxImagePreview}`)
  if (robots.maxVideoPreview) parts.push(`max-video-preview:${robots.maxVideoPreview}`)
  if (robots.maxSnippet) parts.push(`max-snippet:${robots.maxSnippet}`)

  return parts.join(', ') || 'index, follow'
}
