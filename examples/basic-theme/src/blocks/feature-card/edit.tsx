import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor'
import { PanelBody, TextControl, ColorPicker } from '@wordpress/components'
import { __ } from '@wordpress/i18n'
import type { BlockEditProps } from '@wordpress/blocks'
// Attribute types are generated from block.json by @stratawp/vite-plugin.
import type { FeatureCardAttributes } from './block-attributes'

export default function Edit({ attributes, setAttributes }: BlockEditProps<FeatureCardAttributes>) {
  const blockProps = useBlockProps({
    className: 'wp-block-strata-basic-feature-card',
  })

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Icon Settings', 'strata-basic')}>
          <TextControl
            label={__('Icon (emoji or text)', 'strata-basic')}
            value={attributes.icon}
            onChange={(icon) => setAttributes({ icon })}
          />
          <ColorPicker
            color={attributes.iconBackgroundColor}
            onChangeComplete={(color) => setAttributes({ iconBackgroundColor: color.hex })}
          />
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        <div className="feature-icon" style={{ backgroundColor: attributes.iconBackgroundColor }}>
          <span className="feature-icon-content">{attributes.icon}</span>
        </div>
        <RichText
          tagName="h3"
          className="feature-title"
          value={attributes.title}
          onChange={(title) => setAttributes({ title })}
          placeholder={__('Feature title...', 'strata-basic')}
        />
        <RichText
          tagName="p"
          className="feature-description"
          value={attributes.description}
          onChange={(description) => setAttributes({ description })}
          placeholder={__('Feature description...', 'strata-basic')}
        />
      </div>
    </>
  )
}
