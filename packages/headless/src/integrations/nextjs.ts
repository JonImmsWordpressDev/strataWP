/**
 * Next.js Integration Utilities
 */

import type { WordPressClient } from '../client/wordpress-client.js'
import type { WPPost, WPPage, WPQueryParams } from '../types/wordpress.js'

export interface NextJSOptions {
  revalidate?: number | false
  tags?: string[]
}

/**
 * Get all posts for static generation
 */
export async function getAllPosts(
  client: WordPressClient,
  params?: WPQueryParams,
  _options?: NextJSOptions
) {
  const allPosts: WPPost[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await client.getPosts(
      { ...params, page, per_page: 100 },
      { cache: 'force-cache' }
    )

    allPosts.push(...response.data)

    const totalPages = parseInt(response.headers['x-wp-totalpages'], 10)
    hasMore = page < totalPages
    page++
  }

  return allPosts
}

/**
 * Get all pages for static generation
 */
export async function getAllPages(
  client: WordPressClient,
  params?: WPQueryParams,
  _options?: NextJSOptions
) {
  const allPages: WPPage[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await client.getPages(
      { ...params, page, per_page: 100 },
      { cache: 'force-cache' }
    )

    allPages.push(...response.data)

    const totalPages = parseInt(response.headers['x-wp-totalpages'], 10)
    hasMore = page < totalPages
    page++
  }

  return allPages
}

/**
 * Generate static params for posts
 */
export async function generatePostParams(
  client: WordPressClient,
  params?: WPQueryParams
) {
  const posts = await getAllPosts(client, params)
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

/**
 * Generate static params for pages
 */
export async function generatePageParams(
  client: WordPressClient,
  params?: WPQueryParams
) {
  const pages = await getAllPages(client, params)
  return pages.map((page) => ({
    slug: page.slug,
  }))
}

/**
 * Revalidate paths by tag
 */
export function revalidateTag(tag: string) {
  if (typeof window !== 'undefined') {
    console.warn('revalidateTag should only be called on the server')
    return
  }

  try {
    // Next.js 13+ App Router
    const { revalidateTag: nextRevalidateTag } = require('next/cache')
    nextRevalidateTag(tag)
  } catch (error) {
    console.error('Failed to revalidate tag:', error)
  }
}

/**
 * Revalidate specific path
 */
export function revalidatePath(path: string) {
  if (typeof window !== 'undefined') {
    console.warn('revalidatePath should only be called on the server')
    return
  }

  try {
    // Next.js 13+ App Router
    const { revalidatePath: nextRevalidatePath } = require('next/cache')
    nextRevalidatePath(path)
  } catch (error) {
    console.error('Failed to revalidate path:', error)
  }
}

/**
 * Check if request is in preview mode
 */
export function isPreview(cookies: any): boolean {
  return cookies.get('__next_preview_data') !== undefined
}

/**
 * Get preview data from cookies
 */
export function getPreviewData(cookies: any): any {
  const previewData = cookies.get('__next_preview_data')
  if (!previewData) return null

  try {
    return JSON.parse(previewData.value)
  } catch {
    return null
  }
}
