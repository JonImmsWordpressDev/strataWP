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
	 * Raster extensions the build pipeline produces AVIF/WebP siblings for.
	 *
	 * @var string[]
	 */
	private const RASTER_EXTENSIONS = array( 'jpg', 'jpeg', 'png' );

	/**
	 * Sibling formats in preference order (best compression first).
	 *
	 * @var array<string, string>
	 */
	private const SIBLING_TYPES = array(
		'avif' => 'image/avif',
		'webp' => 'image/webp',
	);

	/**
	 * Attribute names the caller may not set (the helper owns them).
	 *
	 * @var string[]
	 */
	private const RESERVED_ATTRIBUTES = array( 'src', 'srcset', 'alt', 'type' );

	/**
	 * Find AVIF/WebP siblings of a theme image that exist on disk.
	 *
	 * @param string $relative_path Path relative to the theme directory (e.g. `dist/images/hero.jpg`).
	 * @return array<int, array{type: string, srcset: string}> Sources, AVIF first.
	 */
	public function get_picture_sources( string $relative_path ): array {
		$extension = strtolower( pathinfo( $relative_path, PATHINFO_EXTENSION ) );

		if ( ! $this->is_safe_path( $relative_path ) || ! in_array( $extension, self::RASTER_EXTENSIONS, true ) ) {
			return array();
		}

		$base    = substr( $relative_path, 0, -( strlen( $extension ) + 1 ) );
		$sources = array();

		foreach ( self::SIBLING_TYPES as $sibling_extension => $mime_type ) {
			$sibling = $base . '.' . $sibling_extension;

			if ( file_exists( get_theme_file_path( $sibling ) ) ) {
				$sources[] = array(
					'type'   => $mime_type,
					'srcset' => get_theme_file_uri( $sibling ),
				);
			}
		}

		return $sources;
	}

	/**
	 * Render a theme image as `<picture>` with AVIF/WebP sources when available.
	 *
	 * @param string               $relative_path Path relative to the theme directory.
	 * @param string               $alt           Alternative text.
	 * @param array<string,string> $attributes    Extra `<img>` attributes (names must be lowercase, no `on*` handlers).
	 * @return string Markup, or an empty string when the path is unsafe or the original is missing.
	 */
	public function render_picture( string $relative_path, string $alt, array $attributes = array() ): string {
		if ( ! $this->is_safe_path( $relative_path ) || ! file_exists( get_theme_file_path( $relative_path ) ) ) {
			return '';
		}

		$attribute_html = '';
		foreach ( $attributes as $name => $value ) {
			$name = (string) $name;

			if ( 1 !== preg_match( '/^[a-z][a-z0-9-]*$/', $name )
				|| 0 === strpos( $name, 'on' )
				|| in_array( $name, self::RESERVED_ATTRIBUTES, true )
			) {
				continue;
			}

			$attribute_html .= sprintf( ' %s="%s"', $name, esc_attr( (string) $value ) );
		}

		$sources = '';
		foreach ( $this->get_picture_sources( $relative_path ) as $source ) {
			$sources .= sprintf( '<source type="%s" srcset="%s">', esc_attr( $source['type'] ), esc_url( $source['srcset'] ) );
		}

		$image = sprintf(
			'<img src="%s" alt="%s"%s>',
			esc_url( get_theme_file_uri( $relative_path ) ),
			esc_attr( $alt ),
			$attribute_html
		);

		return '' === $sources ? $image : '<picture>' . $sources . $image . '</picture>';
	}

	/**
	 * Reject empty, absolute, NUL-containing, or traversing paths.
	 *
	 * @param string $path Candidate theme-relative path.
	 * @return bool
	 */
	private function is_safe_path( string $path ): bool {
		return '' !== $path
			&& false === strpos( $path, "\0" )
			&& 0 !== strpos( $path, '/' )
			&& 1 !== preg_match( '#(^|[\\\\/])\.\.([\\\\/]|$)#', $path );
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
