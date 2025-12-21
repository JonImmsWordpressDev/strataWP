/**
 * React hooks for WordPress data fetching
 */

import useSWR, { type SWRConfiguration } from 'swr'
import type { WPPost, WPQueryParams, WPResponse } from '../types/wordpress.js'
import type { WordPressClient } from '../client/wordpress-client.js'

export interface UsePostsOptions extends SWRConfiguration {
  params?: WPQueryParams
  client: WordPressClient
}

export function usePosts(options: UsePostsOptions) {
  const { params, client, ...swrOptions } = options

  const key = params ? ['posts', JSON.stringify(params)] : ['posts']

  const fetcher = async () => {
    const response = await client.getPosts(params)
    return response
  }

  return useSWR<WPResponse<WPPost[]>>(key, fetcher, swrOptions)
}

export interface UsePostOptions extends SWRConfiguration {
  id?: number
  slug?: string
  params?: WPQueryParams
  client: WordPressClient
}

export function usePost(options: UsePostOptions) {
  const { id, slug, params, client, ...swrOptions } = options

  if (!id && !slug) {
    throw new Error('Either id or slug must be provided')
  }

  const key = id
    ? ['post', id, JSON.stringify(params)]
    : ['post', slug, JSON.stringify(params)]

  const fetcher = async () => {
    if (id) {
      return await client.getPost(id, params)
    }
    return await client.getPostBySlug(slug!, params)
  }

  return useSWR<WPPost | null>(key, fetcher, swrOptions)
}
