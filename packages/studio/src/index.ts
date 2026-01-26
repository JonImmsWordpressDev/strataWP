/**
 * StrataWP Studio
 * Visual design system and page builder for StrataWP
 */

// Export types
export type * from './types'

// Export hooks
export { useLivePreview } from './hooks/useLivePreview'
export { useDesignTokens } from './hooks/useDesignTokens'

// Export components
export { LivePreview } from './components/LivePreview'
export { AdminLayout } from './components/AdminLayout'
export { StudioApp, initStudioApp } from './pages/StudioApp'

// Version
export const VERSION = '1.0.0'
