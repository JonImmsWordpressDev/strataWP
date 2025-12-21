import { useState, useEffect } from 'react'
import type { ComponentInfo } from '../../../src/types'

interface UseComponentsResult {
  components: ComponentInfo[]
  loading: boolean
  error: string | null
}

export function useComponents(): UseComponentsResult {
  const [components, setComponents] = useState<ComponentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchComponents()
    setupWebSocket()
  }, [])

  const fetchComponents = async () => {
    try {
      const response = await fetch('/api/components')
      if (!response.ok) {
        throw new Error('Failed to fetch components')
      }
      const data = await response.json()
      setComponents(data)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  const setupWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}`)

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)

      switch (message.type) {
        case 'init':
          setComponents(message.components)
          break

        case 'component-updated':
          setComponents((prev) => {
            const index = prev.findIndex((c) => c.id === message.component.id)
            if (index >= 0) {
              const next = [...prev]
              next[index] = message.component
              return next
            }
            return [...prev, message.component]
          })
          break

        case 'component-removed':
          setComponents((prev) => prev.filter((c) => c.id !== message.component.id))
          break

        case 'refresh':
          fetchComponents()
          break
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return () => {
      ws.close()
    }
  }

  return { components, loading, error }
}
