/**
 * React hooks for WordPress pages
 */

import useSWR, { type SWRConfiguration } from 'swr'
import type { WPPage, WPQueryParams, WPResponse } from '../types/wordpress.js'
import type { WordPressClient } from '../client/wordpress-client.js'

export interface UsePagesOptions extends SWRConfiguration {
  params?: WPQueryParams
  client: WordPressClient
}

export function usePages(options: UsePagesOptions) {
  const { params, client, ...swrOptions } = options

  const key = params ? ['pages', JSON.stringify(params)] : ['pages']

  const fetcher = async () => {
    const response = await client.getPages(params)
    return response
  }

  return useSWR<WPResponse<WPPage[]>>(key, fetcher, swrOptions)
}

export interface UsePageOptions extends SWRConfiguration {
  id?: number
  slug?: string
  params?: WPQueryParams
  client: WordPressClient
}

export function usePage(options: UsePageOptions) {
  const { id, slug, params, client, ...swrOptions } = options

  if (!id && !slug) {
    throw new Error('Either id or slug must be provided')
  }

  const key = id
    ? ['page', id, JSON.stringify(params)]
    : ['page', slug, JSON.stringify(params)]

  const fetcher = async () => {
    if (id) {
      return await client.getPage(id, params)
    }
    return await client.getPageBySlug(slug!, params)
  }

  return useSWR<WPPage | null>(key, fetcher, swrOptions)
}
