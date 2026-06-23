<?php
/**
 * Image Sizes Component
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;

/**
 * Responsive image `sizes` tuning for better LCP/CLS.
 */
class ImageSizes implements ComponentInterface {

	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'image-sizes';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		add_filter( 'wp_calculate_image_sizes', array( $this, 'filter_content_image_sizes_attr' ), 10, 2 );
		add_filter( 'wp_get_attachment_image_attributes', array( $this, 'filter_post_thumbnail_sizes_attr' ), 10, 3 );
	}

	/**
	 * Tune the `sizes` attribute for content images.
	 *
	 * @param string $sizes A source size value for a 'sizes' attribute.
	 * @param array  $size  Image size [ width, height ] in pixels.
	 * @return string
	 */
	public function filter_content_image_sizes_attr( string $sizes, array $size ): string {
		$width = $size[0] ?? 0;

		if ( 740 <= $width ) {
			$sizes = '100vw';
		}

		if ( is_active_sidebar( 'sidebar-1' ) ) {
			$sizes = '(min-width: 960px) 75vw, 100vw';
		}

		return $sizes;
	}

	/**
	 * Tune the `sizes` attribute for post thumbnails.
	 *
	 * @param array $attr Attributes for the image markup.
	 * @return array
	 */
	public function filter_post_thumbnail_sizes_attr( array $attr ): array {
		$attr['sizes'] = is_active_sidebar( 'sidebar-1' )
			? '(min-width: 960px) 75vw, 100vw'
			: '100vw';

		return $attr;
	}
}
