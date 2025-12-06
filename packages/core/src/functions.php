<?php
/**
 * Helper Functions
 *
 * @package StrataWP
 */

use StrataWP\Theme;

if ( ! function_exists( 'stratawp' ) ) {
	/**
	 * Get theme instance
	 *
	 * @return Theme
	 */
	function stratawp(): Theme {
		return Theme::instance();
	}
}

if ( ! function_exists( 'stratawp_asset_url' ) ) {
	/**
	 * Get asset URL from Vite manifest
	 *
	 * @param string $asset Asset path in src.
	 * @return string
	 */
	function stratawp_asset_url( string $asset ): string {
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

if ( ! function_exists( 'stratawp_template_part' ) ) {
	/**
	 * Load a template part with context
	 *
	 * @param string $slug Template slug.
	 * @param string $name Optional. Template name.
	 * @param array  $args Optional. Arguments to pass to template.
	 */
	function stratawp_template_part( string $slug, string $name = '', array $args = [] ): void {
		if ( ! empty( $args ) ) {
			set_query_var( 'template_args', $args );
		}

		get_template_part( $slug, $name, $args );
	}
}
