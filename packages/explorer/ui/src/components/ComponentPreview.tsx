import { useState } from 'react'
import type { ComponentInfo, ViewportSize } from '../../../src/types'
import './ComponentPreview.css'

interface ComponentPreviewProps {
  component: ComponentInfo
}

const VIEWPORTS: ViewportSize[] = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Full', width: 0, height: 0 },
]

export function ComponentPreview({ component }: ComponentPreviewProps) {
  const [viewport, setViewport] = useState<ViewportSize>(VIEWPORTS[3])
  const [attributes, setAttributes] = useState<Record<string, any>>(
    component.examples?.[0]?.attributes || {}
  )

  const previewStyle =
    viewport.name === 'Full'
      ? { width: '100%', height: '100%' }
      : { width: `${viewport.width}px`, height: `${viewport.height}px` }

  return (
    <div className="component-preview">
      <div className="preview-toolbar">
        <div className="viewport-selector">
          {VIEWPORTS.map((vp) => (
            <button
              key={vp.name}
              className={`viewport-btn ${viewport.name === vp.name ? 'active' : ''}`}
              onClick={() => setViewport(vp)}
              title={
                vp.name === 'Full'
                  ? 'Full width'
                  : `${vp.width}x${vp.height}`
              }
            >
              {vp.name}
            </button>
          ))}
        </div>
        <div className="preview-actions">
          <button className="action-btn" title="Refresh preview">
            ↻
          </button>
          <button className="action-btn" title="Open in new tab">
            ⧉
          </button>
        </div>
      </div>

      <div className="preview-container">
        <div className="preview-frame" style={previewStyle}>
          {component.type === 'block' && (
            <div className="block-preview">
              <h3>{component.title}</h3>
              <p className="preview-placeholder">
                Block preview will be rendered here
              </p>
              {Object.keys(attributes).length > 0 && (
                <pre className="attributes-preview">
                  {JSON.stringify(attributes, null, 2)}
                </pre>
              )}
            </div>
          )}

          {component.type === 'component' && (
            <div className="component-preview-content">
              <h3>{component.title}</h3>
              <p className="preview-placeholder">
                Component preview will be rendered here
              </p>
            </div>
          )}

          {component.type === 'pattern' && (
            <div className="pattern-preview">
              <h3>{component.title}</h3>
              <p className="preview-placeholder">
                Pattern preview will be rendered here
              </p>
            </div>
          )}

          {(component.type === 'template' || component.type === 'part') && (
            <div className="template-preview">
              <h3>{component.title}</h3>
              <p className="preview-placeholder">
                {component.type === 'template' ? 'Template' : 'Template Part'}{' '}
                preview will be rendered here
              </p>
            </div>
          )}
        </div>
      </div>

      {component.attributes && Object.keys(component.attributes).length > 0 && (
        <div className="attributes-panel">
          <h4>Attributes</h4>
          {Object.entries(component.attributes).map(([key, attr]) => (
            <div key={key} className="attribute-control">
              <label>{key}</label>
              {attr.type === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={attributes[key] || false}
                  onChange={(e) =>
                    setAttributes({ ...attributes, [key]: e.target.checked })
                  }
                />
              ) : attr.type === 'number' ? (
                <input
                  type="number"
                  value={attributes[key] || attr.default || 0}
                  onChange={(e) =>
                    setAttributes({ ...attributes, [key]: Number(e.target.value) })
                  }
                />
              ) : (
                <input
                  type="text"
                  value={attributes[key] || attr.default || ''}
                  onChange={(e) =>
                    setAttributes({ ...attributes, [key]: e.target.value })
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
