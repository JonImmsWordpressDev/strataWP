import { useState, useCallback } from '@wordpress/element'
import { Spinner } from '@wordpress/components'
import { __ } from '@wordpress/i18n'
import { useLivePreview } from '../../hooks/useLivePreview'
import { ViewportSwitcher, Viewport } from './ViewportSwitcher'

interface LivePreviewProps {
  previewUrl: string
  tokens?: Record<string, string>
  className?: string
  showViewportSwitcher?: boolean
  showPageSelector?: boolean
  pages?: Array<{ url: string; label: string }>
  onReady?: () => void
}

const VIEWPORT_SIZES: Record<Viewport, { width: number; height: number }> = {
  desktop: { width: 1200, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
}

export function LivePreview({
  previewUrl,
  tokens,
  className = '',
  showViewportSwitcher = true,
  showPageSelector = false,
  pages = [],
  onReady,
}: LivePreviewProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [currentPage, setCurrentPage] = useState(previewUrl)

  const { iframeRef, isLoading, isReady, error, updateTokens, navigate, refresh } =
    useLivePreview({
      previewUrl: currentPage,
      onReady,
    })

  // Update tokens when they change
  const handleTokenUpdate = useCallback(
    (newTokens: Record<string, string>) => {
      if (isReady) {
        updateTokens(newTokens)
      }
    },
    [isReady, updateTokens]
  )

  // Apply tokens on prop change
  if (tokens && isReady) {
    handleTokenUpdate(tokens)
  }

  const handlePageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const url = event.target.value
    setCurrentPage(url)
    navigate(url)
  }

  const viewportSize = VIEWPORT_SIZES[viewport]

  return (
    <div className={`stratawp-live-preview ${className}`}>
      {/* Toolbar */}
      <div className="stratawp-live-preview__toolbar">
        {showViewportSwitcher && (
          <ViewportSwitcher viewport={viewport} onChange={setViewport} />
        )}

        {showPageSelector && pages.length > 0 && (
          <select
            value={currentPage}
            onChange={handlePageChange}
            className="stratawp-live-preview__page-select"
          >
            {pages.map((page) => (
              <option key={page.url} value={page.url}>
                {page.label}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={refresh}
          className="stratawp-live-preview__refresh"
          title={__('Refresh preview', 'stratawp')}
        >
          ↻
        </button>
      </div>

      {/* Preview container */}
      <div
        className="stratawp-live-preview__container"
        style={{
          width: viewport === 'desktop' ? '100%' : viewportSize.width,
          margin: viewport === 'desktop' ? 0 : '0 auto',
        }}
      >
        {isLoading && (
          <div className="stratawp-live-preview__loading">
            {/* @ts-expect-error - WordPress components have React 18 type incompatibility */}
            <Spinner />
            <span>{__('Loading preview...', 'stratawp')}</span>
          </div>
        )}

        {error && (
          <div className="stratawp-live-preview__error">
            <p>{__('Failed to load preview', 'stratawp')}</p>
            <button type="button" onClick={refresh}>
              {__('Try again', 'stratawp')}
            </button>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={`${currentPage}${currentPage.includes('?') ? '&' : '?'}stratawp_preview=1`}
          title={__('Live Preview', 'stratawp')}
          className="stratawp-live-preview__iframe"
          style={{
            width: viewport === 'desktop' ? '100%' : viewportSize.width,
            height: viewportSize.height,
            opacity: isLoading ? 0 : 1,
          }}
        />
      </div>
    </div>
  )
}
