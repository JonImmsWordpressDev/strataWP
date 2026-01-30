import apiFetch from '@wordpress/api-fetch'
import type { BlocksResponse, BlockFilters, BlockCategory } from '../types'

const API_BASE = '/stratawp/v1'

/**
 * Fetch blocks with filters
 */
export async function fetchBlocks(
  filters: Partial<BlockFilters> = {}
): Promise<BlocksResponse> {
  const params = new URLSearchParams()

  if (filters.search) params.append('search', filters.search)
  if (filters.category) params.append('category', filters.category)
  if (filters.source && filters.source !== 'all') params.append('source', filters.source)

  const query = params.toString()
  const path = `${API_BASE}/blocks${query ? `?${query}` : ''}`

  return apiFetch<BlocksResponse>({ path, method: 'GET' })
}

/**
 * Fetch block categories
 */
export async function fetchBlockCategories(): Promise<BlockCategory[]> {
  return apiFetch<BlockCategory[]>({
    path: `${API_BASE}/blocks/categories`,
    method: 'GET',
  })
}
