/**
 * BlockCard component
 *
 * Displays a single block with icon, metadata, and source indicator.
 */

import { Button } from '@wordpress/components'
import { Icon } from '@wordpress/icons'
import { __ } from '@wordpress/i18n'
import type { BlockType } from '../../types'

interface BlockCardProps {
  block: BlockType
  onClick: (block: BlockType) => void
}

/**
 * Render block icon from string (dashicon) or icon object
 */
function BlockIcon({ icon }: { icon: BlockType['icon'] }) {
  if (!icon) {
    // Default block icon
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        className="stratawp-block-card__icon-svg"
      >
        <path d="M19 8h-1V6h-5v2h-2V6H6v2H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zm0 10H5v-8h14v8z" />
      </svg>
    )
  }

  if (typeof icon === 'string') {
    // Dashicon name
    return <span className={`dashicons dashicons-${icon}`} />
  }

  if (typeof icon === 'object' && icon.src) {
    // Icon object with src (could be SVG string, dashicon name, or React element)
    if (typeof icon.src === 'string') {
      if (icon.src.startsWith('<svg') || icon.src.startsWith('<?xml')) {
        // SVG string
        return (
          <span
            className="stratawp-block-card__icon-svg-wrapper"
            dangerouslySetInnerHTML={{ __html: icon.src }}
            style={{
              background: icon.background,
              color: icon.foreground,
            }}
          />
        )
      }
      // Dashicon name
      return <span className={`dashicons dashicons-${icon.src}`} />
    }
    // React element (from @wordpress/icons)
    return <Icon icon={icon.src as any} />
  }

  return null
}

/**
 * Get source badge label and class
 */
function getSourceInfo(source: BlockType['source']): { label: string; className: string } {
  switch (source) {
    case 'theme':
      return { label: __('Theme', 'stratawp'), className: 'stratawp-block-card__source--theme' }
    case 'core':
      return { label: __('Core', 'stratawp'), className: 'stratawp-block-card__source--core' }
    case 'plugin':
      return { label: __('Plugin', 'stratawp'), className: 'stratawp-block-card__source--plugin' }
    default:
      return { label: source, className: '' }
  }
}

/**
 * Card component displaying a single block with icon and metadata
 */
export function BlockCard({ block, onClick }: BlockCardProps) {
  const sourceInfo = getSourceInfo(block.source)

  return (
    <button
      type="button"
      className="stratawp-block-card"
      onClick={() => onClick(block)}
      aria-label={block.title}
    >
      {/* Icon */}
      <div className="stratawp-block-card__icon">
        <BlockIcon icon={block.icon} />
      </div>

      {/* Content */}
      <div className="stratawp-block-card__content">
        <h3 className="stratawp-block-card__title">{block.title}</h3>
        {block.description && (
          <p className="stratawp-block-card__description">{block.description}</p>
        )}
        <div className="stratawp-block-card__meta">
          <span className={`stratawp-block-card__source ${sourceInfo.className}`}>
            {sourceInfo.label}
          </span>
          {block.category && (
            <span className="stratawp-block-card__category">{block.category}</span>
          )}
        </div>
      </div>
    </button>
  )
}
