import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor'
import { PanelBody, TextControl, ColorPicker } from '@wordpress/components'
import { __ } from '@wordpress/i18n'

interface FeatureCardAttributes {
  title: string
  description: string
  icon: string
  iconBackgroundColor: string
}

interface EditProps {
  attributes: FeatureCardAttributes
  setAttributes: (attrs: Partial<FeatureCardAttributes>) => void
}

export default function Edit({ attributes, setAttributes }: EditProps) {
  const blockProps = useBlockProps({
    className: 'wp-block-forge-basic-feature-card',
  })

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Icon Settings', 'forge-basic')}>
          <TextControl
            label={__('Icon (emoji or text)', 'forge-basic')}
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
        <div
          className="feature-icon"
          style={{ backgroundColor: attributes.iconBackgroundColor }}
        >
          <span className="feature-icon-content">{attributes.icon}</span>
        </div>
        <RichText
          tagName="h3"
          className="feature-title"
          value={attributes.title}
          onChange={(title) => setAttributes({ title })}
          placeholder={__('Feature title...', 'forge-basic')}
        />
        <RichText
          tagName="p"
          className="feature-description"
          value={attributes.description}
          onChange={(description) => setAttributes({ description })}
          placeholder={__('Feature description...', 'forge-basic')}
        />
      </div>
    </>
  )
}
