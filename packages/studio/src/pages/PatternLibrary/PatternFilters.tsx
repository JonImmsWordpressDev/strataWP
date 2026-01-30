/**
 * PatternFilters component
 *
 * Filter controls for the Pattern Library including search, source, categories, and tags.
 */

import { Button, SelectControl, TextControl, CheckboxControl } from '@wordpress/components'
import { __ } from '@wordpress/i18n'
import type { PatternFilters as PatternFiltersType, PatternCategory, PatternTag } from '../../types'

interface PatternFiltersProps {
  filters: PatternFiltersType
  categories: PatternCategory[]
  tags: PatternTag[]
  onFilterChange: (filters: Partial<PatternFiltersType>) => void
  onReset: () => void
}

/**
 * Filter controls for the Pattern Library
 */
export function PatternFilters({
  filters,
  categories,
  tags,
  onFilterChange,
  onReset,
}: PatternFiltersProps) {
  const sourceOptions = [
    { label: __('All Sources', 'stratawp'), value: 'all' },
    { label: __('Theme Patterns', 'stratawp'), value: 'theme' },
    { label: __('User Patterns', 'stratawp'), value: 'user' },
  ]

  const handleSearchChange = (search: string) => {
    onFilterChange({ search })
  }

  const handleSourceChange = (source: string) => {
    onFilterChange({ source: source as PatternFiltersType['source'] })
  }

  const handleCategoryChange = (categorySlug: string, isChecked: boolean) => {
    onFilterChange({ category: isChecked ? categorySlug : null })
  }

  const handleTagClick = (tagSlug: string) => {
    // Toggle tag filter
    onFilterChange({ tag: filters.tag === tagSlug ? null : tagSlug })
  }

  const hasActiveFilters =
    filters.search !== '' ||
    filters.source !== 'all' ||
    filters.category !== null ||
    filters.tag !== null

  return (
    <div className="stratawp-pattern-filters">
      {/* Search Input */}
      <div className="stratawp-pattern-filters__section">
        <TextControl
          label={__('Search Patterns', 'stratawp')}
          value={filters.search}
          onChange={handleSearchChange}
          placeholder={__('Search by title or keyword...', 'stratawp')}
          __nextHasNoMarginBottom
        />
      </div>

      {/* Source Filter */}
      <div className="stratawp-pattern-filters__section">
        <SelectControl
          label={__('Source', 'stratawp')}
          value={filters.source}
          options={sourceOptions}
          onChange={handleSourceChange}
          __nextHasNoMarginBottom
        />
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="stratawp-pattern-filters__section">
          <h3 className="stratawp-pattern-filters__section-title">
            {__('Categories', 'stratawp')}
          </h3>
          <div className="stratawp-pattern-filters__categories">
            {categories.map((category) => (
              <CheckboxControl
                key={category.id}
                label={`${category.name} (${category.count})`}
                checked={filters.category === category.slug}
                onChange={(isChecked) => handleCategoryChange(category.slug, isChecked)}
                __nextHasNoMarginBottom
              />
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="stratawp-pattern-filters__section">
          <h3 className="stratawp-pattern-filters__section-title">
            {__('Tags', 'stratawp')}
          </h3>
          <div className="stratawp-pattern-filters__tags">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`stratawp-pattern-filters__tag ${
                  filters.tag === tag.slug ? 'is-active' : ''
                }`}
                onClick={() => handleTagClick(tag.slug)}
                aria-pressed={filters.tag === tag.slug}
              >
                {tag.name}
                <span className="stratawp-pattern-filters__tag-count">{tag.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reset Button */}
      {hasActiveFilters && (
        <div className="stratawp-pattern-filters__section">
          <Button variant="tertiary" onClick={onReset} isDestructive>
            {__('Reset Filters', 'stratawp')}
          </Button>
        </div>
      )}
    </div>
  )
}
