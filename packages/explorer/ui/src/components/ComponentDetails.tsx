import { useState, useEffect } from 'react'
import type { ComponentInfo } from '../../../src/types'
import './ComponentDetails.css'

interface ComponentDetailsProps {
  component: ComponentInfo
}

export function ComponentDetails({ component }: ComponentDetailsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'source' | 'examples'>('info')
  const [sourceCode, setSourceCode] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'source') {
      loadSourceCode()
    }
  }, [activeTab, component.id])

  const loadSourceCode = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/components/${component.id}/source`)
      const data = await response.json()
      setSourceCode(data.content || '')
    } catch (error) {
      console.error('Failed to load source code:', error)
      setSourceCode('// Failed to load source code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="component-details">
      <div className="details-tabs">
        <button
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Info
        </button>
        <button
          className={`tab ${activeTab === 'source' ? 'active' : ''}`}
          onClick={() => setActiveTab('source')}
        >
          Source
        </button>
        {component.examples && component.examples.length > 0 && (
          <button
            className={`tab ${activeTab === 'examples' ? 'active' : ''}`}
            onClick={() => setActiveTab('examples')}
          >
            Examples
          </button>
        )}
      </div>

      <div className="details-content">
        {activeTab === 'info' && (
          <div className="info-tab">
            <div className="info-section">
              <h3>Component Information</h3>
              <dl className="info-list">
                <dt>Name</dt>
                <dd>{component.name}</dd>

                <dt>Title</dt>
                <dd>{component.title}</dd>

                <dt>Type</dt>
                <dd>
                  <span className={`type-badge ${component.type}`}>
                    {component.type}
                  </span>
                </dd>

                {component.description && (
                  <>
                    <dt>Description</dt>
                    <dd>{component.description}</dd>
                  </>
                )}

                {component.category && (
                  <>
                    <dt>Category</dt>
                    <dd>{component.category}</dd>
                  </>
                )}

                <dt>Path</dt>
                <dd>
                  <code className="path">{component.path}</code>
                </dd>
              </dl>
            </div>

            {component.attributes && Object.keys(component.attributes).length > 0 && (
              <div className="info-section">
                <h3>Attributes</h3>
                <table className="attributes-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Default</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(component.attributes).map(([key, attr]) => (
                      <tr key={key}>
                        <td>
                          <code>{key}</code>
                        </td>
                        <td>{attr.type}</td>
                        <td>
                          {attr.default !== undefined ? (
                            <code>{JSON.stringify(attr.default)}</code>
                          ) : (
                            <span className="undefined">undefined</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {component.tags && component.tags.length > 0 && (
              <div className="info-section">
                <h3>Tags</h3>
                <div className="tags-list">
                  {component.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'source' && (
          <div className="source-tab">
            {loading ? (
              <div className="loading-source">Loading source code...</div>
            ) : (
              <pre className="source-code">
                <code>{sourceCode}</code>
              </pre>
            )}
          </div>
        )}

        {activeTab === 'examples' && component.examples && (
          <div className="examples-tab">
            {component.examples.map((example, index) => (
              <div key={index} className="example-item">
                <h4>{example.name}</h4>
                {example.description && <p>{example.description}</p>}
                <pre className="example-code">
                  <code>{JSON.stringify(example.attributes, null, 2)}</code>
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
