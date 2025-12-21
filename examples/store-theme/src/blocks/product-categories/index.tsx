import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, RangeControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

interface Attributes {
  columns: number;
  limit: number;
  showCount: boolean;
  showEmpty: boolean;
}

registerBlockType('strata-store/product-categories', {
  edit: ({ attributes, setAttributes }: { attributes: Attributes; setAttributes: (attrs: Partial<Attributes>) => void }) => {
    const blockProps = useBlockProps({
      className: 'product-categories-editor',
    });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Category Settings', 'strata-store')}>
            <RangeControl
              label={__('Columns', 'strata-store')}
              value={attributes.columns}
              onChange={(columns) => setAttributes({ columns })}
              min={2}
              max={6}
            />

            <RangeControl
              label={__('Number of Categories', 'strata-store')}
              value={attributes.limit}
              onChange={(limit) => setAttributes({ limit })}
              min={1}
              max={20}
            />

            <ToggleControl
              label={__('Show Product Count', 'strata-store')}
              checked={attributes.showCount}
              onChange={(showCount) => setAttributes({ showCount })}
            />

            <ToggleControl
              label={__('Show Empty Categories', 'strata-store')}
              checked={attributes.showEmpty}
              onChange={(showEmpty) => setAttributes({ showEmpty })}
            />
          </PanelBody>
        </InspectorControls>

        <div {...blockProps}>
          <div className="block-placeholder">
            <span className="dashicon dashicons-category"></span>
            <h3>{__('Product Categories', 'strata-store')}</h3>
            <p>
              {__('Displaying ', 'strata-store')}
              {attributes.limit}
              {__(' categories in ', 'strata-store')}
              {attributes.columns}
              {__(' columns', 'strata-store')}
            </p>
          </div>
        </div>
      </>
    );
  },

  save: () => null,
});
