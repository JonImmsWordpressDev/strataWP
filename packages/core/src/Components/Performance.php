<?php
/**
 * Performance Component
 *
 * @package WPForge
 */

namespace WPForge\Components;

use WPForge\ComponentInterface;

/**
 * Performance optimizations
 */
class Performance implements ComponentInterface {
	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'performance';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		add_action( 'wp_head', [ $this, 'add_resource_hints' ], 1 );
		add_filter( 'script_loader_tag', [ $this, 'add_async_defer' ], 10, 3 );
		add_action( 'wp_enqueue_scripts', [ $this, 'remove_wp_bloat' ] );
	}

	/**
	 * Add resource hints
	 */
	public function add_resource_hints(): void {
		// DNS prefetch for external resources
		$hints = apply_filters(
			'wp_forge_resource_hints',
			[
				'//fonts.googleapis.com',
				'//fonts.gstatic.com',
			]
		);

		foreach ( $hints as $hint ) {
			printf( '<link rel="dns-prefetch" href="%s">' . "\n", esc_url( $hint ) );
		}

		// Preconnect for fonts
		echo '<link rel="preconnect" href="https://fonts.googleapis.com">' . "\n";
		echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
	}

	/**
	 * Add async/defer to scripts
	 *
	 * @param string $tag    Script tag.
	 * @param string $handle Script handle.
	 * @param string $src    Script source.
	 * @return string
	 */
	public function add_async_defer( string $tag, string $handle, string $src ): string {
		// Scripts to defer
		$defer_scripts = apply_filters(
			'wp_forge_defer_scripts',
			[ 'wp-forge-main' ]
		);

		if ( in_array( $handle, $defer_scripts, true ) ) {
			return str_replace( '<script ', '<script defer ', $tag );
		}

		return $tag;
	}

	/**
	 * Remove WordPress bloat
	 */
	public function remove_wp_bloat(): void {
		// Remove emoji scripts
		remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
		remove_action( 'wp_print_styles', 'print_emoji_styles' );

		// Remove block library CSS (if not using WordPress blocks)
		if ( ! apply_filters( 'wp_forge_use_block_library', true ) ) {
			wp_dequeue_style( 'wp-block-library' );
			wp_dequeue_style( 'wp-block-library-theme' );
		}

		// Remove global styles (if using custom styles)
		if ( ! apply_filters( 'wp_forge_use_global_styles', true ) ) {
			wp_dequeue_style( 'global-styles' );
		}
	}
}
