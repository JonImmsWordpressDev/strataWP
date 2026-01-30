import { render, Component } from '@wordpress/element'
import type { ReactNode, ErrorInfo } from 'react'
import { Notice } from '@wordpress/components'
import { __ } from '@wordpress/i18n'
import { AdminLayout } from '../components/AdminLayout'
import { DesignSystemPage } from './DesignSystem'
import { BlockLibraryPage } from './BlockLibrary'
import { PatternLibraryPage } from './PatternLibrary'

// Error boundary to catch React rendering errors
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: ReactNode
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('StrataWP Studio Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px' }}>
          <Notice status="error" isDismissible={false}>
            <p>
              <strong>{__('Something went wrong.', 'stratawp')}</strong>
            </p>
            <p>{this.state.error?.message || __('An unexpected error occurred.', 'stratawp')}</p>
            <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
              {__('Check the browser console for more details.', 'stratawp')}
            </p>
          </Notice>
        </div>
      )
    }

    return this.props.children
  }
}

// Placeholder components for other pages
function TemplateBuilderPage() {
  return <div>Template Builder - Coming Soon</div>
}

function StarterSitesPage() {
  return <div>Starter Sites - Coming Soon</div>
}

const PAGE_COMPONENTS: Record<string, React.ComponentType> = {
  'stratawp-studio': DesignSystemPage,
  'stratawp-studio-blocks': BlockLibraryPage,
  'stratawp-studio-patterns': PatternLibraryPage,
  'stratawp-studio-templates': TemplateBuilderPage,
  'stratawp-studio-starters': StarterSitesPage,
}

export function StudioApp() {
  const rootEl = document.getElementById('stratawp-studio-root')
  const currentPage = rootEl?.dataset.page || 'stratawp-studio'

  const PageComponent = PAGE_COMPONENTS[currentPage] || DesignSystemPage

  return (
    <ErrorBoundary>
      <AdminLayout currentPage={currentPage}>
        <ErrorBoundary>
          <PageComponent />
        </ErrorBoundary>
      </AdminLayout>
    </ErrorBoundary>
  )
}

// Initialize app
export function initStudioApp() {
  const rootEl = document.getElementById('stratawp-studio-root')
  if (rootEl) {
    render(<StudioApp />, rootEl)
  }
}

// Auto-init on DOM ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudioApp)
  } else {
    initStudioApp()
  }
}
