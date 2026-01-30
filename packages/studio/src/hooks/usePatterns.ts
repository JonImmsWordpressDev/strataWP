import { useState, useEffect, useCallback } from '@wordpress/element'
import type {
  Pattern,
  PatternCategory,
  PatternTag,
  PatternFilters,
  CreatePatternRequest,
  UpdatePatternRequest,
} from '../types'
import * as api from '../api/patterns'

const DEFAULT_FILTERS: PatternFilters = {
  source: 'all',
  category: null,
  tag: null,
  search: '',
  page: 1,
  perPage: 20,
}

interface UsePatternsReturn {
  // State
  patterns: Pattern[]
  categories: PatternCategory[]
  tags: PatternTag[]
  total: number
  isLoading: boolean
  error: Error | null

  // Filters
  filters: PatternFilters
  setFilters: (filters: Partial<PatternFilters>) => void
  resetFilters: () => void

  // Actions
  createPattern: (data: CreatePatternRequest) => Promise<Pattern | null>
  updatePattern: (id: number, data: UpdatePatternRequest) => Promise<Pattern | null>
  deletePattern: (id: number) => Promise<boolean>
  exportPattern: (id: number) => Promise<string | null>
  duplicatePattern: (id: number) => Promise<Pattern | null>
  refetch: () => Promise<void>
}

export function usePatterns(): UsePatternsReturn {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [categories, setCategories] = useState<PatternCategory[]>([])
  const [tags, setTags] = useState<PatternTag[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFiltersState] = useState<PatternFilters>(DEFAULT_FILTERS)

  // Load patterns when filters change
  const loadPatterns = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.fetchPatterns(filters)
      setPatterns(response.items)
      setTotal(response.total)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load patterns'))
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  // Load taxonomies once on mount
  const loadTaxonomies = useCallback(async () => {
    try {
      const [categoriesData, tagsData] = await Promise.all([
        api.fetchPatternCategories(),
        api.fetchPatternTags(),
      ])
      setCategories(categoriesData)
      setTags(tagsData)
    } catch (err) {
      // Taxonomies loading failure is non-critical
      console.error('Failed to load taxonomies:', err)
    }
  }, [])

  // Load patterns when filters change
  useEffect(() => {
    loadPatterns()
  }, [loadPatterns])

  // Load taxonomies once on mount
  useEffect(() => {
    loadTaxonomies()
  }, [loadTaxonomies])

  // Set filters with automatic page reset when non-page filters change
  const setFilters = useCallback((newFilters: Partial<PatternFilters>) => {
    setFiltersState((prev) => {
      const updated = { ...prev, ...newFilters }

      // Reset page to 1 if any filter other than page changed
      const isPageOnlyChange =
        Object.keys(newFilters).length === 1 && 'page' in newFilters

      if (!isPageOnlyChange && !('page' in newFilters)) {
        updated.page = 1
      }

      return updated
    })
  }, [])

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS)
  }, [])

  // Create pattern
  const createPatternAction = useCallback(
    async (data: CreatePatternRequest): Promise<Pattern | null> => {
      try {
        setError(null)
        const response = await api.createPattern(data)
        if (response.success && response.data) {
          // Optimistically add to local state
          setPatterns((prev) => [response.data, ...prev])
          setTotal((prev) => prev + 1)
          return response.data
        }
        return null
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create pattern'))
        return null
      }
    },
    []
  )

  // Update pattern
  const updatePatternAction = useCallback(
    async (id: number, data: UpdatePatternRequest): Promise<Pattern | null> => {
      try {
        setError(null)
        const response = await api.updatePattern(id, data)
        if (response.success && response.data) {
          // Optimistically update local state
          setPatterns((prev) =>
            prev.map((p) => (p.id === id ? response.data : p))
          )
          return response.data
        }
        return null
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update pattern'))
        return null
      }
    },
    []
  )

  // Delete pattern
  const deletePatternAction = useCallback(async (id: number): Promise<boolean> => {
    try {
      setError(null)
      const response = await api.deletePattern(id)
      if (response.success) {
        // Remove from local state
        setPatterns((prev) => prev.filter((p) => p.id !== id))
        setTotal((prev) => prev - 1)
        return true
      }
      return false
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete pattern'))
      return false
    }
  }, [])

  // Export pattern
  const exportPatternAction = useCallback(
    async (id: number): Promise<string | null> => {
      try {
        setError(null)
        const response = await api.exportPattern(id)
        if (response.success && response.data) {
          const exportPath = response.data.path
          // Update local state with export info
          setPatterns((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, syncStatus: 'exported' as const, exportPath }
                : p
            )
          )
          return exportPath
        }
        return null
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to export pattern'))
        return null
      }
    },
    []
  )

  // Duplicate pattern
  const duplicatePatternAction = useCallback(
    async (id: number): Promise<Pattern | null> => {
      try {
        setError(null)
        const response = await api.duplicatePattern(id)
        if (response.success && response.data) {
          // Add duplicated pattern to local state
          setPatterns((prev) => [response.data, ...prev])
          setTotal((prev) => prev + 1)
          return response.data
        }
        return null
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to duplicate pattern'))
        return null
      }
    },
    []
  )

  // Refetch patterns
  const refetch = useCallback(async () => {
    await loadPatterns()
  }, [loadPatterns])

  return {
    // State
    patterns,
    categories,
    tags,
    total,
    isLoading,
    error,

    // Filters
    filters,
    setFilters,
    resetFilters,

    // Actions
    createPattern: createPatternAction,
    updatePattern: updatePatternAction,
    deletePattern: deletePatternAction,
    exportPattern: exportPatternAction,
    duplicatePattern: duplicatePatternAction,
    refetch,
  }
}
