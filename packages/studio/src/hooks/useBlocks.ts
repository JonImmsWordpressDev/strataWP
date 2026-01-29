import { useState, useEffect, useCallback, useMemo } from '@wordpress/element'
import type { BlockType, BlockCategory, BlockFilters } from '../types'
import * as api from '../api/blocks'

const DEFAULT_FILTERS: BlockFilters = {
  search: '',
  category: null,
  source: 'all',
}

interface UseBlocksReturn {
  // State
  blocks: BlockType[]
  categories: BlockCategory[]
  total: number
  isLoading: boolean
  error: Error | null

  // Filters
  filters: BlockFilters
  setFilters: (filters: Partial<BlockFilters>) => void
  resetFilters: () => void

  // Actions
  refetch: () => Promise<void>
}

export function useBlocks(): UseBlocksReturn {
  const [blocks, setBlocks] = useState<BlockType[]>([])
  const [categories, setCategories] = useState<BlockCategory[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFiltersState] = useState<BlockFilters>(DEFAULT_FILTERS)

  // Load blocks when filters change
  const loadBlocks = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.fetchBlocks(filters)
      setBlocks(response.items)
      setTotal(response.total)
      setCategories(response.categories)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load blocks'))
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  // Load blocks when filters change
  useEffect(() => {
    loadBlocks()
  }, [loadBlocks])

  // Set filters
  const setFilters = useCallback((newFilters: Partial<BlockFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }))
  }, [])

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS)
  }, [])

  // Refetch blocks
  const refetch = useCallback(async () => {
    await loadBlocks()
  }, [loadBlocks])

  // Memoize the filtered blocks to avoid unnecessary re-renders
  const filteredBlocks = useMemo(() => blocks, [blocks])

  return {
    // State
    blocks: filteredBlocks,
    categories,
    total,
    isLoading,
    error,

    // Filters
    filters,
    setFilters,
    resetFilters,

    // Actions
    refetch,
  }
}
