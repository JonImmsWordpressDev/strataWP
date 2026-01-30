/**
 * BlockFilters component
 *
 * Filter controls for the Block Library including search, source, and categories.
 */

import { useState, useEffect } from '@wordpress/element'
import { Button, SelectControl, TextControl } from '@wordpress/components'
import { __ } from '@wordpress/i18n'
import type { BlockFilters as BlockFiltersType, BlockCategory } from '../../types'

interface BlockFiltersProps {
  filters: BlockFiltersType
  categories: BlockCategory[]
  onFilterChange: (filters: Partial<BlockFiltersType>) => void
  onReset: () => void
}

/**
 * Filter controls for the Block Library
 */
export function BlockFilters({
  filters,
  categories,
  onFilterChange,
  onReset,
}: BlockFiltersProps) {
  // Debounced search state
  const [searchValue, setSearchValue] = useState(filters.search)

  // Sync external filter changes to local state
  useEffect(() => {
    setSearchValue(filters.search)
  }, [filters.search])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onFilterChange({ search: searchValue })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue, filters.search, onFilterChange])

  const sourceOptions = [
    { label: __('All Sources', 'stratawp'), value: 'all' },
    { label: __('Theme Blocks', 'stratawp'), value: 'theme' },
    { label: __('Core Blocks', 'stratawp'), value: 'core' },
    { label: __('Plugin Blocks', 'stratawp'), value: 'plugin' },
  ]

  const categoryOptions = [
    { label: __('All Categories', 'stratawp'), value: '' },
    ...categories.map((cat) => ({ label: cat.title, value: cat.slug })),
  ]

  const handleSourceChange = (source: string) => {
    onFilterChange({ source: source as BlockFiltersType['source'] })
  }

  const handleCategoryChange = (category: string) => {
    onFilterChange({ category: category || null })
  }

  const hasActiveFilters =
    filters.search !== '' || filters.source !== 'all' || filters.category !== null

  return (
    <div className="stratawp-block-filters">
      {/* Search Input */}
      <div className="stratawp-block-filters__section">
        <TextControl
          label={__('Search Blocks', 'stratawp')}
          value={searchValue}
          onChange={setSearchValue}
          placeholder={__('Search by name or keyword...', 'stratawp')}
          __nextHasNoMarginBottom
        />
      </div>

      {/* Source Filter */}
      <div className="stratawp-block-filters__section">
        <SelectControl
          label={__('Source', 'stratawp')}
          value={filters.source}
          options={sourceOptions}
          onChange={handleSourceChange}
          __nextHasNoMarginBottom
        />
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="stratawp-block-filters__section">
          <SelectControl
            label={__('Category', 'stratawp')}
            value={filters.category || ''}
            options={categoryOptions}
            onChange={handleCategoryChange}
            __nextHasNoMarginBottom
          />
        </div>
      )}

      {/* Reset Button */}
      {hasActiveFilters && (
        <div className="stratawp-block-filters__section">
          <Button variant="tertiary" onClick={onReset} isDestructive>
            {__('Reset Filters', 'stratawp')}
          </Button>
        </div>
      )}
    </div>
  )
}
