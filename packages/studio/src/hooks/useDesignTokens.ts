import { useState, useEffect, useCallback, useMemo } from '@wordpress/element'
import type { DesignTokens, DesignPreset, ColorToken, FontSize, SpacingSize } from '../types'
import * as api from '../api/designSystem'

interface UseDesignTokensReturn {
  // State
  tokens: DesignTokens | null
  presets: DesignPreset[]
  activePreset: string | null
  isLoading: boolean
  isSaving: boolean
  error: Error | null
  hasChanges: boolean

  // Actions
  updateColor: (slug: string, color: string) => void
  addColor: (color: ColorToken) => void
  removeColor: (slug: string) => void
  updateFontSize: (slug: string, size: FontSize) => void
  updateSpacing: (slug: string, size: SpacingSize) => void
  updateLayout: (key: 'contentSize' | 'wideSize', value: string) => void
  applyPreset: (presetId: string) => Promise<void>
  save: (writeToThemeJson?: boolean) => Promise<void>
  reset: () => void
  exportTokens: () => Promise<void>
  importTokens: (file: File) => Promise<void>

  // Computed
  cssVariables: Record<string, string>
}

export function useDesignTokens(): UseDesignTokensReturn {
  const [tokens, setTokens] = useState<DesignTokens | null>(null)
  const [originalTokens, setOriginalTokens] = useState<DesignTokens | null>(null)
  const [presets, setPresets] = useState<DesignPreset[]>([])
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Load initial data
  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        const [designSystem, presetsData] = await Promise.all([
          api.fetchDesignSystem(),
          api.fetchPresets(),
        ])
        setTokens(designSystem.tokens)
        setOriginalTokens(designSystem.tokens)
        setActivePreset(designSystem.activePreset)
        setPresets(presetsData)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load design system'))
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // Check for changes
  const hasChanges = useMemo(() => {
    if (!tokens || !originalTokens) return false
    return JSON.stringify(tokens) !== JSON.stringify(originalTokens)
  }, [tokens, originalTokens])

  // Color operations
  const updateColor = useCallback((slug: string, color: string) => {
    setTokens((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        colors: {
          ...prev.colors,
          palette: prev.colors.palette.map((c) =>
            c.slug === slug ? { ...c, color } : c
          ),
        },
      }
    })
  }, [])

  const addColor = useCallback((color: ColorToken) => {
    setTokens((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        colors: {
          ...prev.colors,
          palette: [...prev.colors.palette, color],
        },
      }
    })
  }, [])

  const removeColor = useCallback((slug: string) => {
    setTokens((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        colors: {
          ...prev.colors,
          palette: prev.colors.palette.filter((c) => c.slug !== slug),
        },
      }
    })
  }, [])

  // Typography operations
  const updateFontSize = useCallback((slug: string, size: FontSize) => {
    setTokens((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        typography: {
          ...prev.typography,
          fontSizes: prev.typography.fontSizes.map((fs) =>
            fs.slug === slug ? size : fs
          ),
        },
      }
    })
  }, [])

  // Spacing operations
  const updateSpacing = useCallback((slug: string, size: SpacingSize) => {
    setTokens((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        spacing: {
          ...prev.spacing,
          spacingSizes: prev.spacing.spacingSizes.map((ss) =>
            ss.slug === slug ? size : ss
          ),
        },
      }
    })
  }, [])

  // Layout operations
  const updateLayout = useCallback(
    (key: 'contentSize' | 'wideSize', value: string) => {
      setTokens((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          layout: {
            ...prev.layout,
            [key]: value,
          },
        }
      })
    },
    []
  )

  // Apply preset
  const applyPresetAction = useCallback(async (presetId: string) => {
    try {
      setIsLoading(true)
      const response = await api.applyPreset(presetId)
      if (response.success) {
        setTokens(response.data.tokens)
        setOriginalTokens(response.data.tokens)
        setActivePreset(presetId)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to apply preset'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save
  const save = useCallback(
    async (writeToThemeJson = true) => {
      if (!tokens) return
      try {
        setIsSaving(true)
        const response = await api.saveDesignSystem({
          tokens,
          writeToThemeJson,
        })
        if (response.success) {
          setOriginalTokens(tokens)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to save design system'))
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [tokens]
  )

  // Reset to original
  const reset = useCallback(() => {
    setTokens(originalTokens)
  }, [originalTokens])

  // Export
  const exportTokens = useCallback(async () => {
    try {
      const blob = await api.exportDesignSystem()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'design-system.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to export'))
    }
  }, [])

  // Import
  const importTokens = useCallback(async (file: File) => {
    try {
      setIsLoading(true)
      const response = await api.importDesignSystem(file)
      if (response.success) {
        setTokens(response.data.tokens)
        setOriginalTokens(response.data.tokens)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to import'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Compute CSS variables from tokens
  const cssVariables = useMemo(() => {
    if (!tokens) return {}

    const vars: Record<string, string> = {}

    // Colors
    tokens.colors.palette.forEach((color) => {
      vars[`--wp--preset--color--${color.slug}`] = color.color
    })

    // Font sizes
    tokens.typography.fontSizes.forEach((size) => {
      vars[`--wp--preset--font-size--${size.slug}`] = size.size
    })

    // Spacing
    tokens.spacing.spacingSizes.forEach((size) => {
      vars[`--wp--preset--spacing--${size.slug}`] = size.size
    })

    // Layout
    vars['--wp--style--global--content-size'] = tokens.layout.contentSize
    vars['--wp--style--global--wide-size'] = tokens.layout.wideSize

    return vars
  }, [tokens])

  return {
    tokens,
    presets,
    activePreset,
    isLoading,
    isSaving,
    error,
    hasChanges,
    updateColor,
    addColor,
    removeColor,
    updateFontSize,
    updateSpacing,
    updateLayout,
    applyPreset: applyPresetAction,
    save,
    reset,
    exportTokens,
    importTokens,
    cssVariables,
  }
}
