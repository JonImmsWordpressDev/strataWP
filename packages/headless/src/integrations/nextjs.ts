/**
 * Next.js Integration Utilities
 */

import type { WordPressClient } from '../client/wordpress-client.js'
import type { WPPost, WPPage, WPQueryParams } from '../types/wordpress.js'
import {
  SIGNATURE_HEADER,
  isSafeRedirectPath,
  verifyPreviewToken,
  verifyWebhookSignature,
  type PreviewTokenClaims,
  type RevalidateWebhookPayload,
} from '../utils/signing.js'

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
export async function generatePostParams(client: WordPressClient, params?: WPQueryParams) {
  const posts = await getAllPosts(client, params)
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

/**
 * Generate static params for pages
 */
export async function generatePageParams(client: WordPressClient, params?: WPQueryParams) {
  const pages = await getAllPages(client, params)
  return pages.map((page) => ({
    slug: page.slug,
  }))
}

/**
 * Revalidate paths by tag
 */
export async function revalidateTag(tag: string): Promise<void> {
  if (typeof window !== 'undefined') {
    console.warn('revalidateTag should only be called on the server')
    return
  }

  try {
    // Dynamic import keeps `next` optional and works when this package is
    // loaded as native ESM, where `require` does not exist.
    const { revalidateTag: nextRevalidateTag } = await import('next/cache.js')
    ;(nextRevalidateTag as (tag: string) => void)(tag)
  } catch (error) {
    console.error('Failed to revalidate tag:', error)
  }
}

/**
 * Revalidate specific path
 */
export async function revalidatePath(path: string): Promise<void> {
  if (typeof window !== 'undefined') {
    console.warn('revalidatePath should only be called on the server')
    return
  }

  try {
    const { revalidatePath: nextRevalidatePath } = await import('next/cache.js')
    nextRevalidatePath(path)
  } catch (error) {
    console.error('Failed to revalidate path:', error)
  }
}

/**
 * Check if request is in preview mode: Pages Router preview cookie or App
 * Router draft-mode cookie. In App Router code, prefer `isDraftMode()`.
 */
export function isPreview(cookies: any): boolean {
  return (
    cookies.get('__next_preview_data') !== undefined ||
    cookies.get('__prerender_bypass') !== undefined
  )
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

async function draftModeStore(): Promise<{ isEnabled: boolean; enable(): void; disable(): void }> {
  const { draftMode } = await import('next/headers.js')
  // Next 15+ returns a promise; 13 and 14 return the store directly.
  return await (draftMode as () => any)()
}

/**
 * Whether App Router draft mode is on for this request.
 */
export async function isDraftMode(): Promise<boolean> {
  try {
    return (await draftModeStore()).isEnabled
  } catch {
    return false
  }
}

export interface DraftModeRouteOptions {
  /** Secret shared with WordPress (`STRATAWP_HEADLESS_SECRET`). */
  secret: string
  /**
   * Where to send the editor once draft mode is on. Defaults to the post's
   * own path from the token. Must return a same-site path.
   */
  resolvePath?: (claims: PreviewTokenClaims) => string | Promise<string>
}

/**
 * App Router route handler for the WordPress Preview button: verifies the
 * signed token, enables draft mode and redirects to the post's own path.
 *
 * ```ts
 * // app/api/draft/route.ts
 * export const GET = createDraftModeRoute({ secret: process.env.STRATAWP_HEADLESS_SECRET! })
 * ```
 */
export function createDraftModeRoute(options: DraftModeRouteOptions) {
  return async function GET(request: Request): Promise<Response> {
    const token = new URL(request.url).searchParams.get('token') ?? ''
    const claims = await verifyPreviewToken(token, options.secret)
    if (!claims) {
      return Response.json({ message: 'Invalid or expired preview token' }, { status: 401 })
    }

    const path = options.resolvePath ? await options.resolvePath(claims) : claims.path
    if (!isSafeRedirectPath(path)) {
      return Response.json({ message: 'Invalid preview path' }, { status: 400 })
    }

    ;(await draftModeStore()).enable()

    return new Response(null, { status: 307, headers: { Location: path } })
  }
}

/**
 * App Router route handler that turns draft mode off and goes back to `/`
 * (or a same-site `?path=`).
 */
export function createExitDraftModeRoute() {
  return async function GET(request: Request): Promise<Response> {
    ;(await draftModeStore()).disable()
    const path = new URL(request.url).searchParams.get('path') ?? '/'
    return new Response(null, {
      status: 307,
      headers: { Location: isSafeRedirectPath(path) ? path : '/' },
    })
  }
}

export interface RevalidateRouteOptions {
  /** Secret shared with WordPress (`STRATAWP_HEADLESS_SECRET`). */
  secret: string
  /** Reject webhooks older than this many seconds (replay guard). Default 300. */
  maxAge?: number
  /**
   * Revalidate for one event. Default: the post's path, plus tags
   * `wp:<type>` and `wp:<type>:<id>`.
   */
  onRevalidate?: (payload: RevalidateWebhookPayload) => void | Promise<void>
}

/**
 * App Router route handler for the signed webhook WordPress sends on
 * publish, update, unpublish and trash.
 *
 * ```ts
 * // app/api/revalidate/route.ts
 * export const POST = createRevalidateRoute({ secret: process.env.STRATAWP_HEADLESS_SECRET! })
 * ```
 */
export function createRevalidateRoute(options: RevalidateRouteOptions) {
  const maxAge = options.maxAge ?? 300

  return async function POST(request: Request): Promise<Response> {
    const body = await request.text()
    const valid = await verifyWebhookSignature(
      body,
      request.headers.get(SIGNATURE_HEADER),
      options.secret
    )
    if (!valid) {
      return Response.json({ message: 'Invalid signature' }, { status: 401 })
    }

    let payload: RevalidateWebhookPayload
    try {
      payload = JSON.parse(body)
    } catch {
      return Response.json({ message: 'Invalid body' }, { status: 400 })
    }

    const age = Math.floor(Date.now() / 1000) - Number(payload.timestamp)
    if (!Number.isFinite(age) || Math.abs(age) > maxAge) {
      return Response.json({ message: 'Stale webhook' }, { status: 401 })
    }

    if (options.onRevalidate) {
      await options.onRevalidate(payload)
    } else {
      if (typeof payload.path === 'string' && isSafeRedirectPath(payload.path)) {
        await revalidatePath(payload.path)
      }
      await revalidateTag(`wp:${payload.type}`)
      await revalidateTag(`wp:${payload.type}:${payload.id}`)
    }

    return Response.json({ revalidated: true, event: payload.event, path: payload.path })
  }
}
