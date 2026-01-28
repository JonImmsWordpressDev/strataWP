/**
 * PatternGrid component
 *
 * Responsive grid layout for displaying pattern cards with loading states and pagination.
 */

import { Button } from '@wordpress/components'
import { __ } from '@wordpress/i18n'
import { PatternCard } from './PatternCard'
import { PatternGridSkeleton } from './PatternCardSkeleton'
import type { Pattern } from '../../types'

interface PatternGridProps {
  patterns: Pattern[]
  isLoading: boolean
  total: number
  onEdit: (pattern: Pattern) => void
  onDuplicate: (pattern: Pattern) => void
  onExport: (pattern: Pattern) => void
  onDelete: (pattern: Pattern) => void
  onLoadMore: () => void
  hasMore: boolean
}

/**
 * Grid layout for pattern cards with loading states and pagination
 */
export function PatternGrid({
  patterns,
  isLoading,
  total,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  onLoadMore,
  hasMore,
}: PatternGridProps) {
  // Loading state when no patterns loaded yet - show skeleton grid
  if (isLoading && patterns.length === 0) {
    return <PatternGridSkeleton count={6} />
  }

  // Empty state
  if (!isLoading && patterns.length === 0) {
    return (
      <div className="stratawp-pattern-grid__empty">
        <p>{__('No patterns found.', 'stratawp')}</p>
        <p className="stratawp-pattern-grid__empty-hint">
          {__('Try adjusting your filters or create a new pattern.', 'stratawp')}
        </p>
      </div>
    )
  }

  return (
    <div className="stratawp-pattern-grid">
      {/* Grid of Cards */}
      <div className="stratawp-pattern-grid__items">
        {patterns.map((pattern) => (
          <PatternCard
            key={pattern.id}
            pattern={pattern}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onExport={onExport}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Footer with count and Load More */}
      <div className="stratawp-pattern-grid__footer">
        <span className="stratawp-pattern-grid__count">
          {__('Showing', 'stratawp')} {patterns.length} {__('of', 'stratawp')} {total}{' '}
          {__('patterns', 'stratawp')}
        </span>
        {hasMore && (
          <Button
            variant="secondary"
            onClick={onLoadMore}
            disabled={isLoading}
            isBusy={isLoading}
          >
            {isLoading ? __('Loading...', 'stratawp') : __('Load More', 'stratawp')}
          </Button>
        )}
      </div>
    </div>
  )
}
