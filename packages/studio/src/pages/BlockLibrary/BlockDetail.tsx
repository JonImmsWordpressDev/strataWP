/**
 * BlockDetail component
 *
 * Modal displaying detailed information about a selected block.
 */

import { useState, useCallback } from '@wordpress/element'
import { Modal, Button, Notice } from '@wordpress/components'
import { useDispatch } from '@wordpress/data'
import { store as noticesStore } from '@wordpress/notices'
import { __ } from '@wordpress/i18n'
import { copy } from '@wordpress/icons'
import type { BlockType } from '../../types'

interface BlockDetailProps {
  block: BlockType
  onClose: () => void
}

/**
 * Render block icon from string (dashicon) or icon object
 */
function BlockIcon({ icon }: { icon: BlockType['icon'] }) {
  if (!icon) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="48"
        height="48"
        className="stratawp-block-detail__icon-svg"
      >
        <path d="M19 8h-1V6h-5v2h-2V6H6v2H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zm0 10H5v-8h14v8z" />
      </svg>
    )
  }

  if (typeof icon === 'string') {
    return <span className={`dashicons dashicons-${icon}`} style={{ fontSize: '48px' }} />
  }

  if (typeof icon === 'object' && icon.src) {
    if (typeof icon.src === 'string') {
      if (icon.src.startsWith('<svg') || icon.src.startsWith('<?xml')) {
        return (
          <span
            className="stratawp-block-detail__icon-svg-wrapper"
            dangerouslySetInnerHTML={{ __html: icon.src }}
            style={{
              background: icon.background,
              color: icon.foreground,
            }}
          />
        )
      }
      return <span className={`dashicons dashicons-${icon.src}`} style={{ fontSize: '48px' }} />
    }
  }

  return null
}

/**
 * Get source badge info
 */
function getSourceInfo(source: BlockType['source']): { label: string; className: string } {
  switch (source) {
    case 'theme':
      return { label: __('Theme Block', 'stratawp'), className: 'stratawp-block-detail__source--theme' }
    case 'core':
      return { label: __('Core Block', 'stratawp'), className: 'stratawp-block-detail__source--core' }
    case 'plugin':
      return { label: __('Plugin Block', 'stratawp'), className: 'stratawp-block-detail__source--plugin' }
    default:
      return { label: source, className: '' }
  }
}

/**
 * Format supports object for display
 */
function formatSupports(supports: Record<string, unknown>): string[] {
  const supportLabels: Record<string, string> = {
    align: __('Alignment', 'stratawp'),
    alignWide: __('Wide Alignment', 'stratawp'),
    anchor: __('HTML Anchor', 'stratawp'),
    className: __('Custom CSS Class', 'stratawp'),
    color: __('Color Settings', 'stratawp'),
    customClassName: __('Custom Class Name', 'stratawp'),
    html: __('HTML Editing', 'stratawp'),
    inserter: __('Block Inserter', 'stratawp'),
    multiple: __('Multiple Instances', 'stratawp'),
    reusable: __('Reusable', 'stratawp'),
    typography: __('Typography Settings', 'stratawp'),
    spacing: __('Spacing Settings', 'stratawp'),
    border: __('Border Settings', 'stratawp'),
    dimensions: __('Dimension Settings', 'stratawp'),
    layout: __('Layout Settings', 'stratawp'),
  }

  const enabled: string[] = []

  for (const [key, value] of Object.entries(supports)) {
    if (value === true || (typeof value === 'object' && value !== null)) {
      enabled.push(supportLabels[key] || key)
    }
  }

  return enabled.sort()
}

/**
 * Modal displaying detailed block information
 */
export function BlockDetail({ block, onClose }: BlockDetailProps) {
  const [copySuccess, setCopySuccess] = useState(false)
  const { createSuccessNotice } = useDispatch(noticesStore)
  const sourceInfo = getSourceInfo(block.source)
  const enabledSupports = formatSupports(block.supports)

  const handleCopyBlockName = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(block.name)
      setCopySuccess(true)
      createSuccessNotice(__('Block name copied to clipboard', 'stratawp'), {
        type: 'snackbar',
        isDismissible: true,
      })
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [block.name, createSuccessNotice])

  const attributeCount = Object.keys(block.attributes).length

  return (
    <Modal
      title={block.title}
      onRequestClose={onClose}
      className="stratawp-block-detail"
      size="medium"
    >
      <div className="stratawp-block-detail__content">
        {/* Header with icon and basic info */}
        <div className="stratawp-block-detail__header">
          <div className="stratawp-block-detail__icon">
            <BlockIcon icon={block.icon} />
          </div>
          <div className="stratawp-block-detail__header-info">
            <span className={`stratawp-block-detail__source ${sourceInfo.className}`}>
              {sourceInfo.label}
            </span>
            {block.category && (
              <span className="stratawp-block-detail__category">{block.category}</span>
            )}
          </div>
        </div>

        {/* Description */}
        {block.description && (
          <div className="stratawp-block-detail__section">
            <p className="stratawp-block-detail__description">{block.description}</p>
          </div>
        )}

        {/* Block Name */}
        <div className="stratawp-block-detail__section">
          <h4 className="stratawp-block-detail__section-title">
            {__('Block Name', 'stratawp')}
          </h4>
          <div className="stratawp-block-detail__name-row">
            <code className="stratawp-block-detail__name">{block.name}</code>
            <Button
              variant="secondary"
              icon={copy}
              onClick={handleCopyBlockName}
              label={__('Copy block name', 'stratawp')}
              className="stratawp-block-detail__copy-btn"
            >
              {copySuccess ? __('Copied!', 'stratawp') : __('Copy', 'stratawp')}
            </Button>
          </div>
        </div>

        {/* Keywords */}
        {block.keywords && block.keywords.length > 0 && (
          <div className="stratawp-block-detail__section">
            <h4 className="stratawp-block-detail__section-title">
              {__('Keywords', 'stratawp')}
            </h4>
            <div className="stratawp-block-detail__keywords">
              {block.keywords.map((keyword, index) => (
                <span key={index} className="stratawp-block-detail__keyword">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Supports */}
        {enabledSupports.length > 0 && (
          <div className="stratawp-block-detail__section">
            <h4 className="stratawp-block-detail__section-title">
              {__('Supported Features', 'stratawp')}
            </h4>
            <ul className="stratawp-block-detail__supports">
              {enabledSupports.map((support, index) => (
                <li key={index} className="stratawp-block-detail__support-item">
                  {support}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Attributes Summary */}
        <div className="stratawp-block-detail__section">
          <h4 className="stratawp-block-detail__section-title">
            {__('Attributes', 'stratawp')}
          </h4>
          <p className="stratawp-block-detail__attribute-count">
            {attributeCount === 0
              ? __('No custom attributes', 'stratawp')
              : attributeCount === 1
                ? __('1 attribute defined', 'stratawp')
                : `${attributeCount} ${__('attributes defined', 'stratawp')}`}
          </p>
          {attributeCount > 0 && attributeCount <= 10 && (
            <div className="stratawp-block-detail__attributes">
              {Object.entries(block.attributes).map(([name, attr]) => (
                <div key={name} className="stratawp-block-detail__attribute">
                  <code className="stratawp-block-detail__attribute-name">{name}</code>
                  <span className="stratawp-block-detail__attribute-type">
                    {typeof attr === 'object' && attr !== null && 'type' in attr
                      ? String((attr as { type: string }).type)
                      : 'unknown'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Parent/Ancestor constraints */}
        {(block.parent || block.ancestor) && (
          <div className="stratawp-block-detail__section">
            <h4 className="stratawp-block-detail__section-title">
              {__('Block Constraints', 'stratawp')}
            </h4>
            {block.parent && (
              <div className="stratawp-block-detail__constraint">
                <strong>{__('Parent:', 'stratawp')}</strong>{' '}
                <code>{block.parent.join(', ')}</code>
              </div>
            )}
            {block.ancestor && (
              <div className="stratawp-block-detail__constraint">
                <strong>{__('Ancestor:', 'stratawp')}</strong>{' '}
                <code>{block.ancestor.join(', ')}</code>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="stratawp-block-detail__footer">
        <Button variant="primary" onClick={onClose}>
          {__('Close', 'stratawp')}
        </Button>
      </div>
    </Modal>
  )
}
