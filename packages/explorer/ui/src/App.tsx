import { useState, useEffect } from 'react'
import { ComponentList } from './components/ComponentList'
import { ComponentPreview } from './components/ComponentPreview'
import { ComponentDetails } from './components/ComponentDetails'
import { useComponents } from './hooks/useComponents'
import type { ComponentInfo } from '../../src/types'
import './styles/App.css'

function App() {
  const { components, loading, error } = useComponents()
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfo | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    if (components.length > 0 && !selectedComponent) {
      setSelectedComponent(components[0])
    }
  }, [components, selectedComponent])

  const filteredComponents = components.filter((component) => {
    const matchesSearch =
      searchQuery === '' ||
      component.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = typeFilter === 'all' || component.type === typeFilter

    return matchesSearch && matchesType
  })

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading components...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error">
        <h2>Error loading components</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <h1>StrataWP Explorer</h1>
          <span className="badge">{components.length} components</span>
        </div>
        <div className="search-bar">
          <input
            type="search"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="type-filter"
          >
            <option value="all">All Types</option>
            <option value="block">Blocks</option>
            <option value="component">Components</option>
            <option value="pattern">Patterns</option>
            <option value="template">Templates</option>
            <option value="part">Template Parts</option>
          </select>
        </div>
      </header>

      <div className="app-content">
        <aside className="sidebar">
          <ComponentList
            components={filteredComponents}
            selectedComponent={selectedComponent}
            onSelectComponent={setSelectedComponent}
          />
        </aside>

        <main className="main-content">
          {selectedComponent ? (
            <>
              <ComponentPreview component={selectedComponent} />
              <ComponentDetails component={selectedComponent} />
            </>
          ) : (
            <div className="empty-state">
              <h2>No component selected</h2>
              <p>Select a component from the sidebar to preview it.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
