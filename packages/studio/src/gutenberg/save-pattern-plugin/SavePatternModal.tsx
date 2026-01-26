/**
 * Save Pattern Modal
 *
 * Modal dialog for saving selected blocks as a pattern
 */

import { useState, useEffect } from '@wordpress/element'
import { useSelect, useDispatch } from '@wordpress/data'
import { serialize } from '@wordpress/blocks'
import {
  Modal,
  TextControl,
  SelectControl,
  Button,
  Spinner,
} from '@wordpress/components'
import { __ } from '@wordpress/i18n'
import apiFetch from '@wordpress/api-fetch'

interface SavePatternModalProps {
  onClose: () => void
}

interface PatternCategory {
  id: number
  name: string
  slug: string
}

interface Block {
  clientId: string
  name: string
  attributes: Record<string, unknown>
  innerBlocks: Block[]
}

export function SavePatternModal({ onClose }: SavePatternModalProps) {
  const [patternName, setPatternName] = useState('')
  const [categorySlug, setCategorySlug] = useState('')
  const [tags, setTags] = useState('')
  const [categories, setCategories] = useState<PatternCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { createSuccessNotice, createErrorNotice } = useDispatch(
    'core/notices'
  ) as {
    createSuccessNotice: (message: string, options?: Record<string, unknown>) => void
    createErrorNotice: (message: string) => void
  }

  const selectedBlocks = useSelect((select) => {
    const { getSelectedBlockClientIds, getBlocksByClientId } = select(
      'core/block-editor'
    ) as {
      getSelectedBlockClientIds: () => string[]
      getBlocksByClientId: (clientIds: string[]) => Block[]
    }
    const clientIds = getSelectedBlockClientIds()
    return getBlocksByClientId(clientIds)
  }, [])

  // Load categories on mount
  useEffect(() => {
    setIsLoading(true)
    apiFetch<PatternCategory[]>({
      path: '/wp/v2/stratawp-pattern-categories',
    })
      .then((data) => {
        setCategories(data)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [])

  const handleSave = async () => {
    if (!patternName.trim()) {
      createErrorNotice(__('Please enter a pattern name.', 'stratawp'))
      return
    }

    if (!selectedBlocks || selectedBlocks.length === 0) {
      createErrorNotice(__('No blocks selected.', 'stratawp'))
      return
    }

    setIsSaving(true)

    try {
      // Serialize selected blocks to HTML
      const content = serialize(selectedBlocks)

      // Prepare tags array
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      // Create pattern via API
      const response = await apiFetch<{
        success: boolean
        data: { id: number; title: string }
      }>({
        path: '/stratawp/v1/patterns',
        method: 'POST',
        data: {
          title: patternName,
          content,
          categories: categorySlug ? [categorySlug] : [],
          tags: tagArray,
        },
      })

      if (response.success) {
        createSuccessNotice(
          __('Pattern saved successfully!', 'stratawp'),
          {
            type: 'snackbar',
            actions: [
              {
                label: __('View Pattern Library', 'stratawp'),
                url: 'admin.php?page=stratawp-studio-patterns',
              },
            ],
          }
        )
        onClose()
      }
    } catch (error) {
      createErrorNotice(__('Failed to save pattern.', 'stratawp'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      title={__('Save as Pattern', 'stratawp')}
      onRequestClose={onClose}
      className="stratawp-save-pattern-modal"
    >
      <div className="stratawp-save-pattern-modal__content">
        <TextControl
          label={__('Pattern Name', 'stratawp')}
          value={patternName}
          onChange={setPatternName}
          placeholder={__('Enter pattern name...', 'stratawp')}
          autoFocus
        />

        {isLoading ? (
          <div className="stratawp-save-pattern-modal__loading">
            {/* @ts-expect-error - WordPress component types are overly strict */}
            <Spinner />
          </div>
        ) : (
          <SelectControl
            label={__('Category', 'stratawp')}
            value={categorySlug}
            options={[
              { label: __('Select a category...', 'stratawp'), value: '' },
              ...categories.map((cat) => ({
                label: cat.name,
                value: cat.slug,
              })),
            ]}
            onChange={setCategorySlug}
          />
        )}

        <TextControl
          label={__('Tags (optional)', 'stratawp')}
          value={tags}
          onChange={setTags}
          placeholder={__('dark-mode, full-width, minimal', 'stratawp')}
          help={__('Separate tags with commas', 'stratawp')}
        />

        <div className="stratawp-save-pattern-modal__info">
          <p>
            {selectedBlocks?.length === 1
              ? __('1 block selected', 'stratawp')
              : `${selectedBlocks?.length || 0} ${__('blocks selected', 'stratawp')}`}
          </p>
        </div>

        <div className="stratawp-save-pattern-modal__actions">
          <Button variant="secondary" onClick={onClose}>
            {__('Cancel', 'stratawp')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!patternName.trim() || isSaving}
            isBusy={isSaving}
          >
            {__('Save Pattern', 'stratawp')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
