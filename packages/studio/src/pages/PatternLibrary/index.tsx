/**
 * PatternLibraryPage component
 *
 * Main page for the Pattern Library, displaying filterable grid of patterns
 * with actions for create, edit, duplicate, export, and delete.
 */

import { useState } from '@wordpress/element'
import {
  Button,
  Modal,
  TextControl,
  SelectControl,
  Notice,
} from '@wordpress/components'
import { __ } from '@wordpress/i18n'
import { plus } from '@wordpress/icons'
import { usePatterns } from '../../hooks/usePatterns'
import { PatternFilters } from './PatternFilters'
import { PatternGrid } from './PatternGrid'
import type { Pattern } from '../../types'

declare const stratawpStudio: { adminUrl: string }

/**
 * Main Pattern Library page component
 */
export function PatternLibraryPage() {
  const {
    patterns,
    categories,
    tags,
    total,
    isLoading,
    error,
    filters,
    setFilters,
    resetFilters,
    createPattern,
    deletePattern,
    exportPattern,
    duplicatePattern,
  } = usePatterns()

  // Modal state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newPatternTitle, setNewPatternTitle] = useState('')
  const [newPatternCategory, setNewPatternCategory] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState<Pattern | null>(null)

  // Handlers
  const handleEdit = (pattern: Pattern) => {
    // Redirect to WordPress block editor
    window.location.href = `${stratawpStudio.adminUrl}post.php?post=${pattern.id}&action=edit`
  }

  const handleDuplicate = async (pattern: Pattern) => {
    const duplicated = await duplicatePattern(pattern.id)
    if (duplicated) {
      // Pattern is automatically added to state by the hook
    }
  }

  const handleExport = async (pattern: Pattern) => {
    const exportPath = await exportPattern(pattern.id)
    if (exportPath) {
      // eslint-disable-next-line no-alert
      window.alert(
        __('Pattern exported successfully to:', 'stratawp') + '\n' + exportPath
      )
    }
  }

  const handleDeleteClick = (pattern: Pattern) => {
    setConfirmDelete(pattern)
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return

    const success = await deletePattern(confirmDelete.id)
    if (success) {
      setConfirmDelete(null)
    }
  }

  const handleLoadMore = () => {
    setFilters({ page: filters.page + 1 })
  }

  const handleCreatePattern = async () => {
    if (!newPatternTitle.trim()) return

    setIsCreating(true)
    try {
      const pattern = await createPattern({
        title: newPatternTitle.trim(),
        content: '<!-- wp:paragraph --><p>Start building your pattern here.</p><!-- /wp:paragraph -->',
        categories: newPatternCategory ? [newPatternCategory] : [],
      })

      if (pattern) {
        // Reset modal state
        setNewPatternTitle('')
        setNewPatternCategory('')
        setIsNewModalOpen(false)

        // Redirect to editor
        window.location.href = `${stratawpStudio.adminUrl}post.php?post=${pattern.id}&action=edit`
      }
    } finally {
      setIsCreating(false)
    }
  }

  const hasMore = patterns.length < total

  // Category options for the new pattern modal
  const categoryOptions = [
    { label: __('No category', 'stratawp'), value: '' },
    ...categories.map((cat) => ({ label: cat.name, value: cat.slug })),
  ]

  return (
    <div className="stratawp-pattern-library">
      {/* Header */}
      <div className="stratawp-pattern-library__header">
        <h1 className="stratawp-pattern-library__title">
          {__('Pattern Library', 'stratawp')}
        </h1>
        <Button
          variant="primary"
          icon={plus}
          onClick={() => setIsNewModalOpen(true)}
        >
          {__('New Pattern', 'stratawp')}
        </Button>
      </div>

      {/* Error Notice */}
      {error && (
        <Notice status="error" isDismissible={false}>
          {error.message}
        </Notice>
      )}

      {/* Two-column Layout */}
      <div className="stratawp-pattern-library__layout">
        {/* Sidebar with Filters */}
        <aside className="stratawp-pattern-library__sidebar">
          <PatternFilters
            filters={filters}
            categories={categories}
            tags={tags}
            onFilterChange={setFilters}
            onReset={resetFilters}
          />
        </aside>

        {/* Main Content with Grid */}
        <main className="stratawp-pattern-library__main">
          <PatternGrid
            patterns={patterns}
            isLoading={isLoading}
            total={total}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onExport={handleExport}
            onDelete={handleDeleteClick}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        </main>
      </div>

      {/* New Pattern Modal */}
      {isNewModalOpen && (
        <Modal
          title={__('Create New Pattern', 'stratawp')}
          onRequestClose={() => setIsNewModalOpen(false)}
          className="stratawp-pattern-library__modal"
        >
          <div className="stratawp-pattern-library__modal-content">
            <TextControl
              label={__('Pattern Name', 'stratawp')}
              value={newPatternTitle}
              onChange={setNewPatternTitle}
              placeholder={__('Enter pattern name...', 'stratawp')}
              __nextHasNoMarginBottom
            />
            <SelectControl
              label={__('Category', 'stratawp')}
              value={newPatternCategory}
              options={categoryOptions}
              onChange={setNewPatternCategory}
              __nextHasNoMarginBottom
            />
          </div>
          <div className="stratawp-pattern-library__modal-actions">
            <Button
              variant="tertiary"
              onClick={() => setIsNewModalOpen(false)}
              disabled={isCreating}
            >
              {__('Cancel', 'stratawp')}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreatePattern}
              disabled={!newPatternTitle.trim() || isCreating}
              isBusy={isCreating}
            >
              {isCreating ? __('Creating...', 'stratawp') : __('Create Pattern', 'stratawp')}
            </Button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <Modal
          title={__('Delete Pattern', 'stratawp')}
          onRequestClose={() => setConfirmDelete(null)}
          className="stratawp-pattern-library__modal stratawp-pattern-library__modal--confirm"
        >
          <p>
            {__('Are you sure you want to delete', 'stratawp')}{' '}
            <strong>{confirmDelete.title}</strong>?
          </p>
          <p className="stratawp-pattern-library__modal-warning">
            {__('This action cannot be undone.', 'stratawp')}
          </p>
          <div className="stratawp-pattern-library__modal-actions">
            <Button
              variant="tertiary"
              onClick={() => setConfirmDelete(null)}
            >
              {__('Cancel', 'stratawp')}
            </Button>
            <Button
              variant="primary"
              isDestructive
              onClick={handleDeleteConfirm}
            >
              {__('Delete', 'stratawp')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
