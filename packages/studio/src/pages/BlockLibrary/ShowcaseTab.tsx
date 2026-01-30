/**
 * ShowcaseTab component
 *
 * Tab content for browsing and previewing registered blocks.
 */

import { useState } from '@wordpress/element'
import { Notice } from '@wordpress/components'
import { useBlocks } from '../../hooks/useBlocks'
import { BlockFilters } from './BlockFilters'
import { BlockGrid } from './BlockGrid'
import { BlockDetail } from './BlockDetail'
import type { BlockType } from '../../types'

/**
 * Showcase tab displaying all registered blocks with filtering
 */
export function ShowcaseTab() {
  const {
    blocks,
    categories,
    total,
    isLoading,
    error,
    filters,
    setFilters,
    resetFilters,
  } = useBlocks()

  const [selectedBlock, setSelectedBlock] = useState<BlockType | null>(null)

  const handleBlockClick = (block: BlockType) => {
    setSelectedBlock(block)
  }

  const handleCloseDetail = () => {
    setSelectedBlock(null)
  }

  return (
    <div className="stratawp-block-library__showcase">
      {/* Error Notice */}
      {error && (
        <Notice status="error" isDismissible={false}>
          {error.message}
        </Notice>
      )}

      {/* Two-column Layout */}
      <div className="stratawp-block-library__layout">
        {/* Sidebar with Filters */}
        <aside className="stratawp-block-library__sidebar">
          <BlockFilters
            filters={filters}
            categories={categories}
            onFilterChange={setFilters}
            onReset={resetFilters}
          />
        </aside>

        {/* Main Content with Grid */}
        <main className="stratawp-block-library__main">
          <BlockGrid
            blocks={blocks}
            isLoading={isLoading}
            total={total}
            onBlockClick={handleBlockClick}
          />
        </main>
      </div>

      {/* Block Detail Modal */}
      {selectedBlock && (
        <BlockDetail block={selectedBlock} onClose={handleCloseDetail} />
      )}
    </div>
  )
}
