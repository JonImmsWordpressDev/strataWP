/**
 * Save Pattern Toolbar Button
 *
 * Shows in block toolbar when blocks are selected
 */

import { useState } from '@wordpress/element'
import { useSelect } from '@wordpress/data'
import { BlockControls } from '@wordpress/block-editor'
import { ToolbarGroup, ToolbarButton } from '@wordpress/components'
import { symbol } from '@wordpress/icons'
import { __ } from '@wordpress/i18n'
import { SavePatternModal } from './SavePatternModal'

export function SavePatternButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const hasSelection = useSelect((select) => {
    const { getSelectedBlockClientIds } = select('core/block-editor') as {
      getSelectedBlockClientIds: () => string[]
    }
    return getSelectedBlockClientIds().length > 0
  }, [])

  if (!hasSelection) {
    return null
  }

  return (
    <>
      <BlockControls group="other">
        <ToolbarGroup>
          {/* @ts-expect-error - WordPress component types are overly strict */}
          <ToolbarButton
            icon={symbol}
            label={__('Save as Pattern', 'stratawp')}
            onClick={() => setIsModalOpen(true)}
          />
        </ToolbarGroup>
      </BlockControls>
      {isModalOpen && (
        <SavePatternModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  )
}
