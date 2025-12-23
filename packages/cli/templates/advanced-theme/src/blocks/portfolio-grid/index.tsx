import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

interface Attributes {
  columns: number;
  postsPerPage: number;
  category: string;
  orderBy: string;
  order: string;
}

registerBlockType('strata-advanced/portfolio-grid', {
  edit: ({ attributes, setAttributes }: { attributes: Attributes; setAttributes: (attrs: Partial<Attributes>) => void }) => {
    const blockProps = useBlockProps({
      className: 'portfolio-grid-editor',
    });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Portfolio Settings', 'strata-advanced')}>
            <RangeControl
              label={__('Columns', 'strata-advanced')}
              value={attributes.columns}
              onChange={(columns) => setAttributes({ columns })}
              min={1}
              max={4}
            />

            <RangeControl
              label={__('Posts Per Page', 'strata-advanced')}
              value={attributes.postsPerPage}
              onChange={(postsPerPage) => setAttributes({ postsPerPage })}
              min={1}
              max={24}
            />

            <SelectControl
              label={__('Order By', 'strata-advanced')}
              value={attributes.orderBy}
              options={[
                { label: __('Date', 'strata-advanced'), value: 'date' },
                { label: __('Title', 'strata-advanced'), value: 'title' },
                { label: __('Random', 'strata-advanced'), value: 'rand' },
              ]}
              onChange={(orderBy) => setAttributes({ orderBy })}
            />

            <SelectControl
              label={__('Order', 'strata-advanced')}
              value={attributes.order}
              options={[
                { label: __('Descending', 'strata-advanced'), value: 'DESC' },
                { label: __('Ascending', 'strata-advanced'), value: 'ASC' },
              ]}
              onChange={(order) => setAttributes({ order })}
            />
          </PanelBody>
        </InspectorControls>

        <div {...blockProps}>
          <div className="block-placeholder">
            <span className="dashicon dashicons-portfolio"></span>
            <h3>{__('Portfolio Grid', 'strata-advanced')}</h3>
            <p>
              {__('Displaying ', 'strata-advanced')}
              {attributes.postsPerPage}
              {__(' portfolio items in ', 'strata-advanced')}
              {attributes.columns}
              {__(' columns', 'strata-advanced')}
            </p>
          </div>
        </div>
      </>
    );
  },

  save: () => null, // Dynamic block, rendered in PHP
});
