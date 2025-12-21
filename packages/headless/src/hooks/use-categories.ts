/**
 * React hooks for WordPress categories
 */

import useSWR, { type SWRConfiguration } from 'swr'
import type { WPCategory, WPQueryParams, WPResponse } from '../types/wordpress.js'
import type { WordPressClient } from '../client/wordpress-client.js'

export interface UseCategoriesOptions extends SWRConfiguration {
  params?: WPQueryParams
  client: WordPressClient
}

export function useCategories(options: UseCategoriesOptions) {
  const { params, client, ...swrOptions } = options

  const key = params ? ['categories', JSON.stringify(params)] : ['categories']

  const fetcher = async () => {
    const response = await client.getCategories(params)
    return response
  }

  return useSWR<WPResponse<WPCategory[]>>(key, fetcher, swrOptions)
}

export interface UseCategoryOptions extends SWRConfiguration {
  id: number
  params?: WPQueryParams
  client: WordPressClient
}

export function useCategory(options: UseCategoryOptions) {
  const { id, params, client, ...swrOptions } = options

  const key = ['category', id, JSON.stringify(params)]

  const fetcher = async () => {
    return await client.getCategory(id, params)
  }

  return useSWR<WPCategory>(key, fetcher, swrOptions)
}
