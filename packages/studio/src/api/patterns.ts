import apiFetch from '@wordpress/api-fetch'
import type {
  Pattern,
  PatternCategory,
  PatternTag,
  CreatePatternRequest,
  UpdatePatternRequest,
  PatternFilters,
  PatternsResponse,
  PatternExportResponse,
  ApiResponse,
} from '../types'

const API_BASE = '/stratawp/v1'

/**
 * Fetch patterns with filters
 */
export async function fetchPatterns(
  filters: Partial<PatternFilters> = {}
): Promise<PatternsResponse> {
  const params = new URLSearchParams()

  if (filters.source) params.append('source', filters.source)
  if (filters.category) params.append('category', filters.category)
  if (filters.tag) params.append('tag', filters.tag)
  if (filters.search) params.append('search', filters.search)
  if (filters.page) params.append('page', String(filters.page))
  if (filters.perPage) params.append('per_page', String(filters.perPage))

  const query = params.toString()
  const path = `${API_BASE}/patterns${query ? `?${query}` : ''}`

  return apiFetch<PatternsResponse>({ path, method: 'GET' })
}

/**
 * Fetch single pattern
 */
export async function fetchPattern(id: number): Promise<Pattern> {
  return apiFetch<Pattern>({
    path: `${API_BASE}/patterns/${id}`,
    method: 'GET',
  })
}

/**
 * Create pattern
 */
export async function createPattern(
  data: CreatePatternRequest
): Promise<ApiResponse<Pattern>> {
  return apiFetch<ApiResponse<Pattern>>({
    path: `${API_BASE}/patterns`,
    method: 'POST',
    data,
  })
}

/**
 * Update pattern
 */
export async function updatePattern(
  id: number,
  data: UpdatePatternRequest
): Promise<ApiResponse<Pattern>> {
  return apiFetch<ApiResponse<Pattern>>({
    path: `${API_BASE}/patterns/${id}`,
    method: 'PUT',
    data,
  })
}

/**
 * Delete pattern
 */
export async function deletePattern(
  id: number
): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<ApiResponse<{ message: string }>>({
    path: `${API_BASE}/patterns/${id}`,
    method: 'DELETE',
  })
}

/**
 * Export pattern to theme
 */
export async function exportPattern(
  id: number
): Promise<ApiResponse<PatternExportResponse>> {
  return apiFetch<ApiResponse<PatternExportResponse>>({
    path: `${API_BASE}/patterns/${id}/export`,
    method: 'POST',
  })
}

/**
 * Duplicate pattern
 */
export async function duplicatePattern(
  id: number
): Promise<ApiResponse<Pattern>> {
  return apiFetch<ApiResponse<Pattern>>({
    path: `${API_BASE}/patterns/${id}/duplicate`,
    method: 'POST',
  })
}

/**
 * Fetch theme patterns only
 */
export async function fetchThemePatterns(): Promise<PatternsResponse> {
  return apiFetch<PatternsResponse>({
    path: `${API_BASE}/patterns/theme`,
    method: 'GET',
  })
}

/**
 * Fetch pattern categories
 */
export async function fetchPatternCategories(): Promise<PatternCategory[]> {
  return apiFetch<PatternCategory[]>({
    path: '/wp/v2/stratawp-pattern-categories',
    method: 'GET',
  })
}

/**
 * Fetch pattern tags
 */
export async function fetchPatternTags(): Promise<PatternTag[]> {
  return apiFetch<PatternTag[]>({
    path: '/wp/v2/stratawp-pattern-tags',
    method: 'GET',
  })
}
