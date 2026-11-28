<?php
/**
 * Headless Component
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;

/**
 * Exposes each post's parsed block tree as a read-only `blocks` REST field,
 * so a decoupled frontend can render blocks as its own components.
 *
 * Opt-in: not part of the default component list.
 *
 * The field is added to items the REST controller already returns, so it
 * inherits the existing read permissions (drafts and private posts stay
 * behind authentication). Password-protected posts return an empty list
 * until the password is supplied, matching `content.rendered`.
 */
class Headless implements ComponentInterface {
	/**
	 * REST field name.
	 */
	public const FIELD = 'blocks';

	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'headless';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		add_action( 'rest_api_init', array( $this, 'register_rest_field' ) );
	}

	/**
	 * Register the `blocks` field on every REST-enabled content type.
	 */
	public function register_rest_field(): void {
		register_rest_field(
			$this->get_post_types(),
			self::FIELD,
			array(
				'get_callback' => array( $this, 'get_blocks_field' ),
				'schema'       => array(
					'description' => 'Parsed blocks with attributes, inner blocks and rendered HTML.',
					'type'        => 'array',
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
					'items'       => array( 'type' => 'object' ),
				),
			)
		);
	}

	/**
	 * Post types that get the field: REST-enabled, excluding attachments and
	 * WordPress's internal `wp_*` types (templates, reusable blocks, navigation).
	 *
	 * @return string[]
	 */
	public function get_post_types(): array {
		$types = array_values(
			array_filter(
				get_post_types( array( 'show_in_rest' => true ), 'names' ),
				static function ( $type ) {
					return 'attachment' !== $type && 0 !== strpos( $type, 'wp_' );
				}
			)
		);

		/**
		 * Filter the post types that expose the `blocks` REST field.
		 *
		 * @param string[] $types Post type names.
		 */
		return (array) apply_filters( 'stratawp_headless_post_types', $types );
	}

	/**
	 * REST get_callback for the `blocks` field.
	 *
	 * @param array $post Prepared post data (has `id`).
	 * @return array
	 */
	public function get_blocks_field( $post ): array {
		$post_id = isset( $post['id'] ) ? (int) $post['id'] : 0;
		if ( $post_id <= 0 || post_password_required( $post_id ) ) {
			return array();
		}

		$content = (string) get_post_field( 'post_content', $post_id );
		if ( '' === $content ) {
			return array();
		}

		return $this->format_blocks( parse_blocks( $content ) );
	}

	/**
	 * Turn a `parse_blocks()` tree into the public field shape.
	 *
	 * Whitespace between blocks (null-named blocks with no content) is dropped;
	 * classic content becomes `core/freeform`, as in the editor.
	 *
	 * @param array $blocks Parsed blocks.
	 * @return array
	 */
	public function format_blocks( array $blocks ): array {
		$output = array();

		foreach ( $blocks as $block ) {
			$name = isset( $block['blockName'] ) ? $block['blockName'] : null;

			if ( null === $name ) {
				if ( '' === trim( (string) ( $block['innerHTML'] ?? '' ) ) ) {
					continue;
				}
				$name = 'core/freeform';
			}

			$attributes = $this->with_defaults( $name, (array) ( $block['attrs'] ?? array() ) );

			/**
			 * Filter a block's attributes before they are exposed over REST.
			 * Return the array without any attribute that should stay private.
			 *
			 * @param array  $attributes Attributes with registered defaults applied.
			 * @param string $name       Block name.
			 * @param array  $block      The parsed block.
			 */
			$attributes = (array) apply_filters( 'stratawp_headless_block_attributes', $attributes, $name, $block );

			$output[] = array(
				'name'        => $name,
				'attributes'  => (object) $attributes,
				'innerBlocks' => $this->format_blocks( (array) ( $block['innerBlocks'] ?? array() ) ),
				'rendered'    => render_block( $block ),
			);
		}

		return $output;
	}

	/**
	 * Fill in attribute defaults from the registered block type, the same
	 * values the block's render callback would see.
	 *
	 * @param string $name       Block name.
	 * @param array  $attributes Attributes from the block comment.
	 * @return array
	 */
	public function with_defaults( string $name, array $attributes ): array {
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $name );
		if ( ! $type || ! is_array( $type->attributes ) ) {
			return $attributes;
		}

		foreach ( $type->attributes as $key => $schema ) {
			if ( ! array_key_exists( $key, $attributes ) && is_array( $schema ) && array_key_exists( 'default', $schema ) ) {
				$attributes[ $key ] = $schema['default'];
			}
		}

		return $attributes;
	}
}
