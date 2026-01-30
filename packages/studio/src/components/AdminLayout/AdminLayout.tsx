import { __ } from '@wordpress/i18n'
import type { ReactNode } from 'react'

interface AdminLayoutProps {
  children: ReactNode
  currentPage: string
}

const NAV_ITEMS = [
  { id: 'stratawp-studio', label: __('Design System', 'stratawp'), icon: '🎨' },
  { id: 'stratawp-studio-blocks', label: __('Block Library', 'stratawp'), icon: '📦' },
  { id: 'stratawp-studio-patterns', label: __('Pattern Library', 'stratawp'), icon: '🧩' },
  { id: 'stratawp-studio-templates', label: __('Template Builder', 'stratawp'), icon: '📄' },
  { id: 'stratawp-studio-starters', label: __('Starter Sites', 'stratawp'), icon: '🚀' },
]

export function AdminLayout({ children, currentPage }: AdminLayoutProps) {
  return (
    <div className="stratawp-studio">
      <header className="stratawp-studio__header">
        <h1 className="stratawp-studio__title">
          <span className="stratawp-studio__logo">⚡</span>
          {__('StrataWP Studio', 'stratawp')}
        </h1>
        <nav className="stratawp-studio__nav">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`?page=${item.id}`}
              className={`stratawp-studio__nav-item ${
                currentPage === item.id ? 'is-active' : ''
              }`}
            >
              <span className="stratawp-studio__nav-icon">{item.icon}</span>
              <span className="stratawp-studio__nav-label">{item.label}</span>
            </a>
          ))}
        </nav>
      </header>
      <main className="stratawp-studio__content">{children}</main>
    </div>
  )
}
