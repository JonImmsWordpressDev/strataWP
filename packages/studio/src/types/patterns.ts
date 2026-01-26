/**
 * Pattern types for Pattern Library
 */

export type PatternSource = 'theme' | 'user'
export type PatternSyncStatus = 'local' | 'exported' | 'modified'

export interface Pattern {
  id: number
  title: string
  slug: string
  content: string
  categories: string[]
  tags: string[]
  keywords: string[]
  viewport: string
  source: PatternSource
  syncStatus: PatternSyncStatus | null
  exportPath: string | null
  blockTypes: string[]
  createdAt: string | null
  modifiedAt: string | null
}

export interface PatternCategory {
  id: number
  name: string
  slug: string
  count: number
}

export interface PatternTag {
  id: number
  name: string
  slug: string
  count: number
}

export interface CreatePatternRequest {
  title: string
  content: string
  categories?: string[]
  tags?: string[]
  keywords?: string[]
}

export interface UpdatePatternRequest {
  title?: string
  content?: string
  categories?: string[]
  tags?: string[]
  keywords?: string[]
}

export interface PatternFilters {
  source: 'all' | 'theme' | 'user'
  category: string | null
  tag: string | null
  search: string
  page: number
  perPage: number
}

export interface PatternsResponse {
  items: Pattern[]
  total: number
}

export interface PatternExportResponse {
  path: string
}
