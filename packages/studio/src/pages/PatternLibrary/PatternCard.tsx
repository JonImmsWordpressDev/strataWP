/**
 * PatternCard component
 *
 * Displays a single pattern with preview, metadata, and action buttons.
 */

import { Button, DropdownMenu, MenuGroup, MenuItem } from '@wordpress/components'
import { __ } from '@wordpress/i18n'
import { pencil, moreVertical, copy, download, trash } from '@wordpress/icons'
import type { Pattern } from '../../types'

interface PatternCardProps {
  pattern: Pattern
  onEdit: (pattern: Pattern) => void
  onDuplicate: (pattern: Pattern) => void
  onExport: (pattern: Pattern) => void
  onDelete: (pattern: Pattern) => void
}

/**
 * Card component displaying a single pattern with preview and actions
 */
export function PatternCard({
  pattern,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
}: PatternCardProps) {
  const isUserPattern = pattern.source === 'user'

  const getSyncStatusLabel = (): string | null => {
    if (!pattern.syncStatus) return null
    switch (pattern.syncStatus) {
      case 'exported':
        return __('Exported', 'stratawp')
      case 'modified':
        return __('Modified', 'stratawp')
      case 'local':
        return __('Local only', 'stratawp')
      default:
        return null
    }
  }

  const syncStatusLabel = getSyncStatusLabel()

  return (
    <div className="stratawp-pattern-card">
      {/* Preview Area */}
      <div className="stratawp-pattern-card__preview">
        <div
          className="stratawp-pattern-card__preview-content"
          dangerouslySetInnerHTML={{ __html: pattern.content }}
        />

        {/* Hover Actions Overlay */}
        <div className="stratawp-pattern-card__actions">
          {isUserPattern && (
            <Button
              variant="primary"
              icon={pencil}
              label={__('Edit Pattern', 'stratawp')}
              onClick={() => onEdit(pattern)}
              className="stratawp-pattern-card__action-btn"
            >
              {__('Edit', 'stratawp')}
            </Button>
          )}
          <DropdownMenu
            icon={moreVertical}
            label={__('More actions', 'stratawp')}
            className="stratawp-pattern-card__dropdown"
          >
            {({ onClose }) => (
              <MenuGroup>
                <MenuItem
                  icon={copy}
                  onClick={() => {
                    onDuplicate(pattern)
                    onClose()
                  }}
                >
                  {__('Duplicate', 'stratawp')}
                </MenuItem>
                <MenuItem
                  icon={download}
                  onClick={() => {
                    onExport(pattern)
                    onClose()
                  }}
                >
                  {__('Export to Theme', 'stratawp')}
                </MenuItem>
                {isUserPattern && (
                  <MenuItem
                    icon={trash}
                    isDestructive
                    onClick={() => {
                      onDelete(pattern)
                      onClose()
                    }}
                  >
                    {__('Delete', 'stratawp')}
                  </MenuItem>
                )}
              </MenuGroup>
            )}
          </DropdownMenu>
        </div>
      </div>

      {/* Card Footer */}
      <div className="stratawp-pattern-card__footer">
        <div className="stratawp-pattern-card__info">
          <h3 className="stratawp-pattern-card__title">{pattern.title}</h3>
          <div className="stratawp-pattern-card__meta">
            <span
              className={`stratawp-pattern-card__source stratawp-pattern-card__source--${pattern.source}`}
            >
              {pattern.source === 'theme'
                ? __('Theme', 'stratawp')
                : __('User', 'stratawp')}
            </span>
            {syncStatusLabel && (
              <span
                className={`stratawp-pattern-card__sync-status stratawp-pattern-card__sync-status--${pattern.syncStatus}`}
              >
                {syncStatusLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
