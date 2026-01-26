import { render } from '@wordpress/element'
import { AdminLayout } from '../components/AdminLayout'
import { DesignSystemPage } from './DesignSystem'
import { PatternLibraryPage } from './PatternLibrary'

// Placeholder components for other pages
function BlockLibraryPage() {
  return <div>Block Library - Coming Soon</div>
}

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
    <AdminLayout currentPage={currentPage}>
      <PageComponent />
    </AdminLayout>
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
