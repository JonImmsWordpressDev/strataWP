import { useState } from '@wordpress/element'
import { Button, Spinner, Notice } from '@wordpress/components'
import { __ } from '@wordpress/i18n'
import { useDesignTokens } from '../../hooks/useDesignTokens'
import { LivePreview } from '../../components/LivePreview'

declare const stratawpStudio: {
  previewUrl: string
}

export function DesignSystemPage() {
  const {
    tokens,
    presets,
    activePreset,
    isLoading,
    isSaving,
    error,
    hasChanges,
    updateColor,
    applyPreset,
    save,
    reset,
    cssVariables,
  } = useDesignTokens()

  const [selectedPreset, setSelectedPreset] = useState<string | null>(activePreset)

  if (isLoading) {
    return (
      <div className="stratawp-design-system__loading">
        {/* @ts-expect-error - WordPress components have React 18 type incompatibility */}
        <Spinner />
        <p>{__('Loading design system...', 'stratawp')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <Notice status="error" isDismissible={false}>
        {error.message}
      </Notice>
    )
  }

  if (!tokens) {
    return (
      <Notice status="warning" isDismissible={false}>
        {__('No design tokens found. Make sure your theme has a theme.json file.', 'stratawp')}
      </Notice>
    )
  }

  const handlePresetSelect = async (presetId: string) => {
    setSelectedPreset(presetId)
    await applyPreset(presetId)
  }

  const handleSave = async () => {
    try {
      await save(true)
    } catch (err) {
      // Error is handled by hook
    }
  }

  return (
    <div className="stratawp-design-system">
      {/* Toolbar */}
      <div className="stratawp-design-system__toolbar">
        <div className="stratawp-design-system__toolbar-left">
          {hasChanges && (
            <span className="stratawp-design-system__unsaved">
              {__('Unsaved changes', 'stratawp')}
            </span>
          )}
        </div>
        <div className="stratawp-design-system__toolbar-right">
          {hasChanges && (
            <Button variant="tertiary" onClick={reset}>
              {__('Reset', 'stratawp')}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            isBusy={isSaving}
          >
            {isSaving ? __('Saving...', 'stratawp') : __('Save Changes', 'stratawp')}
          </Button>
        </div>
      </div>

      <div className="stratawp-design-system__layout">
        {/* Controls Panel */}
        <div className="stratawp-design-system__controls">
          {/* Presets Section */}
          <section className="stratawp-design-system__section">
            <h2>{__('Design Presets', 'stratawp')}</h2>
            <p className="description">
              {__('Quick start with a curated design preset.', 'stratawp')}
            </p>
            <div className="stratawp-design-system__presets">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`stratawp-design-system__preset ${
                    selectedPreset === preset.id ? 'is-selected' : ''
                  }`}
                  onClick={() => handlePresetSelect(preset.id)}
                >
                  <span className="stratawp-design-system__preset-name">
                    {preset.name}
                  </span>
                  <span className="stratawp-design-system__preset-description">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Colors Section */}
          <section className="stratawp-design-system__section">
            <h2>{__('Colors', 'stratawp')}</h2>
            <div className="stratawp-design-system__colors">
              {tokens.colors.palette.map((color) => (
                <div key={color.slug} className="stratawp-design-system__color">
                  <label>
                    <span className="stratawp-design-system__color-name">
                      {color.name}
                    </span>
                    <input
                      type="color"
                      value={color.color}
                      onChange={(e) => updateColor(color.slug, e.target.value)}
                      className="stratawp-design-system__color-input"
                    />
                    <span className="stratawp-design-system__color-value">
                      {color.color}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* More sections for typography, spacing, etc. */}
        </div>

        {/* Live Preview Panel */}
        <div className="stratawp-design-system__preview">
          <LivePreview
            previewUrl={stratawpStudio.previewUrl}
            tokens={cssVariables}
            showViewportSwitcher={true}
          />
        </div>
      </div>
    </div>
  )
}
