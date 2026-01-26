import { useState, useCallback, useRef, useEffect } from '@wordpress/element'
import type { PreviewMessage } from '../types'

interface UseLivePreviewOptions {
  previewUrl: string
  onReady?: () => void
  onError?: (error: Error) => void
}

interface UseLivePreviewReturn {
  iframeRef: React.RefObject<HTMLIFrameElement>
  isReady: boolean
  isLoading: boolean
  error: Error | null
  updateTokens: (tokens: Record<string, string>) => void
  navigate: (url: string) => void
  refresh: () => void
}

export function useLivePreview({
  previewUrl,
  onReady,
  onError,
}: UseLivePreviewOptions): UseLivePreviewReturn {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const isReadyRef = useRef(isReady)
  isReadyRef.current = isReady
  const loadTimeoutRef = useRef<NodeJS.Timeout>()

  // Listen for ready message from preview
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      const expectedOrigin = new URL(previewUrl).origin
      if (event.origin !== expectedOrigin) {
        return
      }

      const data = event.data as PreviewMessage

      if (data.type === 'stratawp_ready') {
        setIsReady(true)
        setIsLoading(false)
        onReady?.()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [previewUrl, onReady])

  // Handle iframe load
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      // Give the preview script time to initialize
      loadTimeoutRef.current = setTimeout(() => {
        if (!isReadyRef.current) {
          setIsLoading(false)
          // Preview might not have our script, but it's still usable
        }
      }, 2000)
    }

    const handleError = () => {
      const err = new Error('Failed to load preview')
      setError(err)
      setIsLoading(false)
      onError?.(err)
    }

    iframe.addEventListener('load', handleLoad)
    iframe.addEventListener('error', handleError)

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
      iframe.removeEventListener('load', handleLoad)
      iframe.removeEventListener('error', handleError)
    }
  }, [onError])

  // Send design tokens to preview
  const updateTokens = useCallback((tokens: Record<string, string>) => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return

    const message: PreviewMessage = {
      type: 'stratawp_design_update',
      tokens,
    }

    const origin = new URL(previewUrl).origin
    iframe.contentWindow.postMessage(message, origin)
  }, [previewUrl])

  // Navigate preview to URL
  const navigate = useCallback((url: string) => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return

    const message: PreviewMessage = {
      type: 'stratawp_navigate',
      url,
    }

    const origin = new URL(previewUrl).origin
    iframe.contentWindow.postMessage(message, origin)
  }, [previewUrl])

  // Refresh preview
  const refresh = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    setIsLoading(true)
    setIsReady(false)
    iframe.src = iframe.src
  }, [])

  return {
    iframeRef,
    isReady,
    isLoading,
    error,
    updateTokens,
    navigate,
    refresh,
  }
}
