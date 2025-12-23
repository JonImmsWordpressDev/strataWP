import { useBlockProps, RichText, MediaUpload, InspectorControls } from '@wordpress/block-editor'
import { PanelBody, RangeControl, Button } from '@wordpress/components'
import { __ } from '@wordpress/i18n'

interface HeroAttributes {
  title: string
  description: string
  buttonText: string
  buttonUrl: string
  backgroundImage?: string
  overlayOpacity: number
}

interface EditProps {
  attributes: HeroAttributes
  setAttributes: (attrs: Partial<HeroAttributes>) => void
}

export default function Edit({ attributes, setAttributes }: EditProps) {
  const blockProps = useBlockProps({
    className: 'wp-block-forge-basic-hero',
    style: {
      backgroundImage: attributes.backgroundImage
        ? `url(${attributes.backgroundImage})`
        : undefined,
    },
  })

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Settings', 'forge-basic')}>
          <MediaUpload
            onSelect={(media: any) => setAttributes({ backgroundImage: media.url })}
            allowedTypes={['image']}
            render={({ open }) => (
              <Button onClick={open} variant="secondary">
                {attributes.backgroundImage
                  ? __('Change Background', 'forge-basic')
                  : __('Set Background', 'forge-basic')}
              </Button>
            )}
          />
          {attributes.backgroundImage && (
            <>
              <RangeControl
                label={__('Overlay Opacity', 'forge-basic')}
                value={attributes.overlayOpacity}
                onChange={(value) => setAttributes({ overlayOpacity: value ?? 0.5 })}
                min={0}
                max={1}
                step={0.1}
              />
              <Button
                onClick={() => setAttributes({ backgroundImage: undefined })}
                isDestructive
                variant="secondary"
              >
                {__('Remove Background', 'forge-basic')}
              </Button>
            </>
          )}
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        {attributes.backgroundImage && (
          <div
            className="hero-overlay"
            style={{ opacity: attributes.overlayOpacity }}
          />
        )}
        <div className="hero-content">
          <RichText
            tagName="h1"
            className="hero-title"
            value={attributes.title}
            onChange={(title) => setAttributes({ title })}
            placeholder={__('Hero Title...', 'forge-basic')}
          />
          <RichText
            tagName="p"
            className="hero-description"
            value={attributes.description}
            onChange={(description) => setAttributes({ description })}
            placeholder={__('Hero description...', 'forge-basic')}
          />
          <div className="hero-button-wrapper">
            <RichText
              tagName="span"
              className="hero-button"
              value={attributes.buttonText}
              onChange={(buttonText) => setAttributes({ buttonText })}
              placeholder={__('Button text...', 'forge-basic')}
            />
          </div>
        </div>
      </div>
    </>
  )
}
