import type { ComponentInfo } from '../../../src/types'
import './ComponentList.css'

interface ComponentListProps {
  components: ComponentInfo[]
  selectedComponent: ComponentInfo | null
  onSelectComponent: (component: ComponentInfo) => void
}

export function ComponentList({
  components,
  selectedComponent,
  onSelectComponent,
}: ComponentListProps) {
  // Group components by type
  const groupedComponents = components.reduce((acc, component) => {
    if (!acc[component.type]) {
      acc[component.type] = []
    }
    acc[component.type].push(component)
    return acc
  }, {} as Record<string, ComponentInfo[]>)

  const typeLabels: Record<string, string> = {
    block: 'Blocks',
    component: 'Components',
    pattern: 'Patterns',
    template: 'Templates',
    part: 'Template Parts',
  }

  return (
    <div className="component-list">
      {Object.entries(groupedComponents).map(([type, items]) => (
        <div key={type} className="component-group">
          <h3 className="group-title">
            {typeLabels[type] || type} ({items.length})
          </h3>
          <ul className="component-items">
            {items.map((component) => (
              <li
                key={component.id}
                className={`component-item ${
                  selectedComponent?.id === component.id ? 'active' : ''
                }`}
                onClick={() => onSelectComponent(component)}
              >
                <div className="component-item-header">
                  <span className={`component-type-badge ${component.type}`}>
                    {component.type}
                  </span>
                  <h4 className="component-title">{component.title}</h4>
                </div>
                {component.description && (
                  <p className="component-description">{component.description}</p>
                )}
                {component.tags && component.tags.length > 0 && (
                  <div className="component-tags">
                    {component.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
