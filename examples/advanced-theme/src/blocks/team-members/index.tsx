import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, RangeControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

interface Attributes {
  columns: number;
  postsPerPage: number;
  department: string;
  showBio: boolean;
}

registerBlockType('strata-advanced/team-members', {
  edit: ({ attributes, setAttributes }: { attributes: Attributes; setAttributes: (attrs: Partial<Attributes>) => void }) => {
    const blockProps = useBlockProps({
      className: 'team-members-editor',
    });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Team Settings', 'strata-advanced')}>
            <RangeControl
              label={__('Columns', 'strata-advanced')}
              value={attributes.columns}
              onChange={(columns) => setAttributes({ columns })}
              min={1}
              max={5}
            />

            <RangeControl
              label={__('Number of Members', 'strata-advanced')}
              value={attributes.postsPerPage}
              onChange={(postsPerPage) => setAttributes({ postsPerPage })}
              min={-1}
              max={20}
              help={__('-1 displays all members', 'strata-advanced')}
            />

            <ToggleControl
              label={__('Show Bio', 'strata-advanced')}
              checked={attributes.showBio}
              onChange={(showBio) => setAttributes({ showBio })}
            />
          </PanelBody>
        </InspectorControls>

        <div {...blockProps}>
          <div className="block-placeholder">
            <span className="dashicon dashicons-groups"></span>
            <h3>{__('Team Members', 'strata-advanced')}</h3>
            <p>
              {__('Displaying team members in ', 'strata-advanced')}
              {attributes.columns}
              {__(' columns', 'strata-advanced')}
            </p>
          </div>
        </div>
      </>
    );
  },

  save: () => null,
});
