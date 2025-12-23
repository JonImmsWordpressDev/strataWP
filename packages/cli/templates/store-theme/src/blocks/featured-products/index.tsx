import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

interface Attributes {
  columns: number;
  limit: number;
  orderBy: string;
  order: string;
}

registerBlockType('strata-store/featured-products', {
  edit: ({ attributes, setAttributes }: { attributes: Attributes; setAttributes: (attrs: Partial<Attributes>) => void }) => {
    const blockProps = useBlockProps({
      className: 'featured-products-editor',
    });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Featured Products Settings', 'strata-store')}>
            <RangeControl
              label={__('Columns', 'strata-store')}
              value={attributes.columns}
              onChange={(columns) => setAttributes({ columns })}
              min={2}
              max={6}
            />

            <RangeControl
              label={__('Number of Products', 'strata-store')}
              value={attributes.limit}
              onChange={(limit) => setAttributes({ limit })}
              min={1}
              max={24}
            />

            <SelectControl
              label={__('Order By', 'strata-store')}
              value={attributes.orderBy}
              options={[
                { label: __('Date', 'strata-store'), value: 'date' },
                { label: __('Title', 'strata-store'), value: 'title' },
                { label: __('Price', 'strata-store'), value: 'price' },
                { label: __('Popularity', 'strata-store'), value: 'popularity' },
                { label: __('Rating', 'strata-store'), value: 'rating' },
                { label: __('Random', 'strata-store'), value: 'rand' },
              ]}
              onChange={(orderBy) => setAttributes({ orderBy })}
            />

            <SelectControl
              label={__('Order', 'strata-store')}
              value={attributes.order}
              options={[
                { label: __('Descending', 'strata-store'), value: 'DESC' },
                { label: __('Ascending', 'strata-store'), value: 'ASC' },
              ]}
              onChange={(order) => setAttributes({ order })}
            />
          </PanelBody>
        </InspectorControls>

        <div {...blockProps}>
          <div className="block-placeholder">
            <span className="dashicon dashicons-star-filled"></span>
            <h3>{__('Featured Products', 'strata-store')}</h3>
            <p>
              {__('Displaying ', 'strata-store')}
              {attributes.limit}
              {__(' featured products in ', 'strata-store')}
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
