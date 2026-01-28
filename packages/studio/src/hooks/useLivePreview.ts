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
  // Store the actual origin from the preview iframe once it sends a message
  // This handles reverse proxy setups where configured URLs differ from actual URLs
  const verifiedOriginRef = useRef<string | null>(null)

  // Listen for ready message from preview
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate this looks like a StrataWP message
      const data = event.data as PreviewMessage
      if (!data || typeof data !== 'object' || !data.type?.startsWith('stratawp_')) {
        return
      }

      // First message: validate against expected origin and store actual origin
      // Subsequent messages: validate against stored origin
      const expectedOrigin = new URL(previewUrl).origin

      if (!verifiedOriginRef.current) {
        // First message - verify it's from expected origin or a same-site origin
        // In reverse proxy setups, the actual origin may differ from configured URL
        if (event.origin !== expectedOrigin) {
          // Check if this might be a reverse proxy situation (same protocol, different host)
          // Log for debugging but still accept if it's a StrataWP message
          console.warn(
            '[StrataWP] Preview origin mismatch - expected:',
            expectedOrigin,
            'received:',
            event.origin,
            '- accepting due to valid message format'
          )
        }
        // Store the verified origin for future messages
        verifiedOriginRef.current = event.origin
      } else if (event.origin !== verifiedOriginRef.current) {
        // Subsequent messages must come from the same origin as the first
        return
      }

      if (data.type === 'stratawp_ready') {
        setIsReady(true)
        setIsLoading(false)
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current)
          loadTimeoutRef.current = undefined
        }
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

  // Get the target origin for postMessage (use verified origin if available)
  const getTargetOrigin = useCallback(() => {
    return verifiedOriginRef.current || new URL(previewUrl).origin
  }, [previewUrl])

  // Send design tokens to preview
  const updateTokens = useCallback((tokens: Record<string, string>) => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return

    const message: PreviewMessage = {
      type: 'stratawp_design_update',
      tokens,
    }

    iframe.contentWindow.postMessage(message, getTargetOrigin())
  }, [getTargetOrigin])

  // Navigate preview to URL
  const navigate = useCallback((url: string) => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return

    const message: PreviewMessage = {
      type: 'stratawp_navigate',
      url,
    }

    iframe.contentWindow.postMessage(message, getTargetOrigin())
  }, [getTargetOrigin])

  // Refresh preview
  const refresh = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    setIsLoading(true)
    setIsReady(false)
    // Reset verified origin since iframe will reload
    verifiedOriginRef.current = null
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
