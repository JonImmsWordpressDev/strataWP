/**
 * Export all types
 */

export * from './design-tokens'
export {
  type ApiResponse,
  type ApiError,
  type PaginatedResponse,
  type DesignSystemResponse,
  type SaveDesignSystemRequest,
  type Template,
  type TemplateSlot,
  type TemplateCondition,
  type StarterSite,
  type ImportStarterRequest,
} from './api'
export * from './patterns'

// Studio configuration
export interface StudioConfig {
  apiBase: string
  nonce: string
  previewUrl: string
  themeSlug: string
  version: string
}

// Live preview message types
export interface PreviewMessage {
  type: 'stratawp_design_update' | 'stratawp_navigate' | 'stratawp_ready'
  tokens?: Record<string, string>
  url?: string
}

// Admin page context
export interface StudioContext {
  config: StudioConfig
  currentPage: string
  isLoading: boolean
}
