<?php
/**
 * Helper Functions
 *
 * @package WPForge
 */

use WPForge\Theme;

if ( ! function_exists( 'wp_forge' ) ) {
	/**
	 * Get theme instance
	 *
	 * @return Theme
	 */
	function wp_forge(): Theme {
		return Theme::instance();
	}
}

if ( ! function_exists( 'wp_forge_asset_url' ) ) {
	/**
	 * Get asset URL from Vite manifest
	 *
	 * @param string $asset Asset path in src.
	 * @return string
	 */
	function wp_forge_asset_url( string $asset ): string {
		$manifest_path = get_template_directory() . '/dist/.vite/manifest.json';

		if ( ! file_exists( $manifest_path ) ) {
			return '';
		}

		$manifest = json_decode( file_get_contents( $manifest_path ), true );

		if ( ! isset( $manifest[ $asset ] ) ) {
			return '';
		}

		return get_template_directory_uri() . '/dist/' . $manifest[ $asset ]['file'];
	}
}

if ( ! function_exists( 'wp_forge_template_part' ) ) {
	/**
	 * Load a template part with context
	 *
	 * @param string $slug Template slug.
	 * @param string $name Optional. Template name.
	 * @param array  $args Optional. Arguments to pass to template.
	 */
	function wp_forge_template_part( string $slug, string $name = '', array $args = [] ): void {
		if ( ! empty( $args ) ) {
			set_query_var( 'template_args', $args );
		}

		get_template_part( $slug, $name, $args );
	}
}
