/**
 * BlockGrid component
 *
 * Responsive grid layout for displaying block cards with loading states.
 */

import { __ } from '@wordpress/i18n'
import { BlockCard } from './BlockCard'
import { BlockGridSkeleton } from './BlockCardSkeleton'
import type { BlockType } from '../../types'

interface BlockGridProps {
  blocks: BlockType[]
  isLoading: boolean
  total: number
  onBlockClick: (block: BlockType) => void
}

/**
 * Grid layout for block cards with loading states
 */
export function BlockGrid({ blocks, isLoading, total, onBlockClick }: BlockGridProps) {
  // Loading state when no blocks loaded yet - show skeleton grid
  if (isLoading && blocks.length === 0) {
    return <BlockGridSkeleton count={9} />
  }

  // Empty state
  if (!isLoading && blocks.length === 0) {
    return (
      <div className="stratawp-block-grid__empty">
        <p>{__('No blocks found.', 'stratawp')}</p>
        <p className="stratawp-block-grid__empty-hint">
          {__('Try adjusting your filters or search query.', 'stratawp')}
        </p>
      </div>
    )
  }

  return (
    <div className="stratawp-block-grid">
      {/* Grid of Cards */}
      <div className="stratawp-block-grid__items">
        {blocks.map((block) => (
          <BlockCard key={block.name} block={block} onClick={onBlockClick} />
        ))}
      </div>

      {/* Footer with count */}
      <div className="stratawp-block-grid__footer">
        <span className="stratawp-block-grid__count">
          {__('Showing', 'stratawp')} {blocks.length}{' '}
          {blocks.length === 1 ? __('block', 'stratawp') : __('blocks', 'stratawp')}
        </span>
      </div>
    </div>
  )
}
