/**
 * API response and request types
 */

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  code: string
  message: string
  data?: unknown
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// Design System API
export interface DesignSystemResponse {
  tokens: import('./design-tokens').DesignTokens
  activePreset: string | null
  lastModified: string
}

export interface SaveDesignSystemRequest {
  tokens: Partial<import('./design-tokens').DesignTokens>
  writeToThemeJson?: boolean
}

// Patterns API
export interface Pattern {
  id: number
  title: string
  slug: string
  content: string
  categories: string[]
  keywords: string[]
  source: 'theme' | 'user' | 'starter'
  screenshot?: string
  createdAt: string
  modifiedAt: string
}

export interface CreatePatternRequest {
  title: string
  content: string
  categories?: string[]
  keywords?: string[]
}

// Templates API
export interface Template {
  slug: string
  title: string
  description?: string
  content: string
  type: 'page' | 'post' | 'archive' | 'special' | 'custom'
  slots: TemplateSlot[]
  conditions: TemplateCondition[]
}

export interface TemplateSlot {
  id: string
  name: string
  position: 'header' | 'before_content' | 'after_content' | 'footer'
  patterns: string[]
}

export interface TemplateCondition {
  type: 'page' | 'post_type' | 'taxonomy' | 'archive' | 'user_state' | 'url'
  value: string
  priority: number
}

// Starter Sites API
export interface StarterSite {
  id: string
  name: string
  description: string
  category: string
  industry: string
  preview: string
  pages: string[]
  tokens: import('./design-tokens').DesignTokens
}

export interface ImportStarterRequest {
  starterId: string
  options: {
    importDesignSystem: boolean
    importTemplates: boolean
    importPatterns: boolean
    importPages: boolean
    importMedia: boolean
  }
  conflictResolution: 'merge' | 'replace' | 'skip'
}
